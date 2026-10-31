<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<script lang="ts">
	import {currentDay} from '../domain/calendar.ts';
	import type {GuildIndex} from '../domain/types.ts';
	import {
		describeDisturbance,
		describeQuality,
		describeViolation,
		mapName,
	} from '../i18n/describe.ts';
	import {t, weekday} from '../i18n/i18n.svelte.ts';
	import type {PlannerState} from '../state/planner.svelte.ts';
	import DayExplorer, {type ExplorerView} from './DayExplorer.svelte';
	import {RESULT_TITLE} from './focus.ts';
	import Icon from './Icon.svelte';
	import Scoreboard from './Scoreboard.svelte';

	let {planner}: {planner: PlannerState} = $props();
	const id = $props.id();

	// What the plan shows, which the copy action follows.
	let focus = $state<GuildIndex | undefined>();
	let view = $state<ExplorerView>('day');
	// Players mostly look during the week for that day's declares.
	let day = $state(currentDay(new Date()));
	let toast = $state<string | undefined>();
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	const isSolving = $derived(planner.solve.phase === 'solving');
	const quality = $derived(planner.result?.quality);
	// Fairest is for plans that share by the goal alone.
	const isFair = $derived(
		planner.result !== undefined && !planner.result.settings.fillMap && !planner.result.settings.targets,
	);
	// Days the plan keeps as they happened; an out-of-date plan predates them.
	const played = $derived(planner.stale ? 0 : planner.played.length);
	const summary = $derived.by(() => {
		if (isSolving) {
			return t('result.improving');
		}

		return quality === undefined || !planner.result ? '' : describeQuality(quality, planner.result.settings);
	});

	function notify(message: string) {
		toast = message;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = undefined), 2500);
	}

	async function copy(text: string, done: string) {
		try {
			await navigator.clipboard.writeText(text);
			notify(done);
		} catch {
			// No clipboard access: let them copy it by hand.
			// eslint-disable-next-line no-alert
			prompt(t('result.copyThis'), text);
		}
	}

	async function share() {
		const url = planner.shareUrl();
		if (navigator.share) {
			try {
				await navigator.share({
					title: t('result.shareTitle', {map: mapName(planner.map)}),
					url,
				});
				return;
			} catch (error) {
				if ((error as Error).name === 'AbortError') {
					return;
				}
			}
		}

		await copy(url, t('result.linkCopied'));
	}

	/**
	The first day the copied text lists: the day picked, as the days before
	it are history by then, or Wednesday on the start or the whole week.
	*/
	const from = $derived(view === 'day' ? Math.max(day, 1) : 1);
	const fromDay = $derived(weekday(from, 'long'));
	// The copy button and its toast name the guild picked, and the first day
	// unless it is Wednesday.
	const copyWording = $derived.by(() => {
		const guild = focus === undefined ? undefined : planner.displayNames[focus]!;
		if (from > 1) {
			return guild === undefined
				? {label: t('result.copyFrom', {day: fromDay}), done: t('result.planCopiedFrom', {day: fromDay})}
				: {
					label: t('result.copyDeclaresFrom', {guild, day: fromDay}),
					done: t('result.declaresCopiedFrom', {guild, day: fromDay}),
				};
		}

		return guild === undefined
			? {label: t('result.copy'), done: t('result.planCopied')}
			: {label: t('result.copyDeclares', {guild}), done: t('result.declaresCopied', {guild})};
	});

	function copyText() {
		const text = planner.shareText({guild: focus, from});
		if (text !== undefined) {
			copy(text, copyWording.done);
		}
	}
</script>

{#if planner.result && planner.timeline && planner.scores}
	<section class="card result" aria-labelledby={RESULT_TITLE} aria-busy={isSolving}>
		<header class="card-head">
			<div>
				<h2 id={RESULT_TITLE} tabindex="-1">
					{t('result.title')}
					{#if !isSolving && (quality === 'optimal' || quality === 'proven')}
						<span class="badge good">
							<Icon name="trophy" />
							{t(isFair ? 'result.fairest' : 'result.best')}
						</span>
					{:else if !isSolving && quality === 'unproven'}
						<span class="badge">{t('result.bestFound')}</span>
					{/if}
				</h2>
				<p class="sub">{summary}</p>
				{#if played > 0}
					<p class="sub">{t('result.played', {day: weekday(played, 'long')})}</p>
				{/if}
			</div>
		</header>

		{#if planner.stale && !isSolving}
			<div class="stale" role="status">
				<Icon name="alert" />
				<p>{t('result.stale')}</p>
				{#if planner.status.complete}
					<button class="btn small primary" onclick={() => planner.findPlan()}>
						{t('result.update')}
					</button>
				{/if}
			</div>
		{/if}

		{#if planner.timeline.violations[0]}
			<div class="stale" role="alert">
				<Icon name="alert" />
				<p>
					{t('result.broken', {
						problem: describeViolation(
							planner.map,
							planner.timeline.violations[0],
							planner.displayNames,
						),
					})}
				</p>
			</div>
		{:else}
			{#if planner.disturbance}
				<div class="stale" role="status">
					<Icon name="alert" />
					<p>{describeDisturbance(planner.map, planner.disturbance, planner.displayNames)}</p>
				</div>
			{/if}
			<div class="body">
				<Scoreboard
					scores={planner.scores}
					guildNames={planner.displayNames}
					settings={planner.result.settings}
				/>
				<DayExplorer
					map={planner.map}
					timeline={planner.timeline}
					scores={planner.scores}
					guildNames={planner.displayNames}
					inactive={planner.result.settings.inactive}
					{played}
					bind:focus
					bind:view
					bind:day
				/>
			</div>

			<div class="actions">
				<button class="btn primary" onclick={share} disabled={planner.stale || isSolving}>
					<Icon name="share" />
					{t('result.share')}
				</button>
				<button
					class="btn"
					onclick={copyText}
					disabled={planner.stale || isSolving}
					aria-describedby={from > 1 ? `${id}-copy-from` : undefined}
				>
					<Icon name="copy" />
					{copyWording.label}
				</button>
			</div>
			{#if from > 1}
				<p class="hint" id="{id}-copy-from">{t('result.copyFromHint', {day: fromDay})}</p>
			{/if}
		{/if}

		<div class="toast" class:show={toast !== undefined} role="status">
			{toast ?? ''}
		</div>
	</section>
{/if}

<style>
	.result {
		position: relative;
	}

	h2 {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.badge.good {
		background: var(--success-soft);
		color: var(--success);
	}

	.badge :global(svg) {
		width: 16px;
		height: 16px;
	}

	.stale {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 16px;
		padding: 12px;
		border-radius: var(--radius-sm);
		background: var(--warning-soft);
		color: var(--warning);
		font-weight: 600;
		font-size: 0.9rem;
	}

	.stale p {
		flex: 1;
		margin: 0;
	}

	.stale > :global(svg) {
		flex: none;
		width: 20px;
		height: 20px;
	}

	.body {
		display: grid;
		gap: 16px;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 16px;
	}

	/* A label naming a guild and a day can be longer than a narrow phone. */
	.actions .btn {
		flex: 1 1 140px;
		padding-block: 8px;
		white-space: normal;
		text-align: center;
	}

	.hint {
		margin: 8px 0 0;
		color: var(--muted);
		font-size: 0.85rem;
	}

	.toast {
		position: fixed;
		left: 50%;
		bottom: calc(24px + env(safe-area-inset-bottom));
		z-index: 10;
		padding: 12px 24px;
		border-radius: 999px;
		background: var(--text);
		color: var(--surface);
		font-weight: 600;
		box-shadow: var(--shadow);
		opacity: 0;
		transform: translate(-50%, 12px);
		transition:
			opacity 0.2s,
			transform 0.2s;
		pointer-events: none;
	}

	.toast.show {
		opacity: 1;
		transform: translate(-50%, 0);
	}
</style>
