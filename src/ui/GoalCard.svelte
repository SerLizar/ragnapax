<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<script lang="ts">
	import {untrack} from 'svelte';
	import {
		activeGuilds,
		efforts,
		GOALS,
		priorities,
		refinements,
		type Goal,
	} from '../domain/settings.ts';
	import {MAX_DECLARATIONS_PER_DAY, POINTS} from '../domain/types.ts';
	import {
		describeCriterion,
		describeEffort,
		describeFailure,
		goalLabel,
	} from '../i18n/describe.ts';
	import {t} from '../i18n/i18n.svelte.ts';
	import type {PlannerState} from '../state/planner.svelte.ts';
	import AdvancedOptions from './AdvancedOptions.svelte';
	import {focusFallback} from './focus.ts';
	import Icon from './Icon.svelte';
	import SolveProgress from './SolveProgress.svelte';
	import Switch from './Switch.svelte';

	let {planner}: {planner: PlannerState} = $props();
	const id = $props.id();

	const descriptions: Record<Goal, () => string> = {
		points: () =>
			t('goal.points.description', {
				town: POINTS.town,
				dorm: POINTS.dormitory,
				castle: POINTS.castle,
			}),
		resources: () => t('goal.resources.description'),
	};

	const isSolving = $derived(planner.solve.phase === 'solving');
	const failure = $derived(planner.solve.phase === 'failed' ? planner.solve : undefined);
	const isUpToDate = $derived(planner.result !== undefined && !planner.stale);
	// The guild order runs over the guilds that play.
	const playing = $derived(activeGuilds(planner.settings).map(g => planner.displayNames[g]!));
	// Holdings set by hand replace the goal and filling the map.
	const isByHand = $derived(planner.targets !== undefined);
	// Opens with the card when an advanced option is in use, so the choice
	// is in view, but never closes by itself while the player changes it.
	let isAdvancedOpen = $state(
		untrack(() => planner.targets !== undefined || planner.fewestDays || planner.inactive.length > 0),
	);
</script>

<section class="card" aria-labelledby="goal-title">
	<header class="card-head">
		<div>
			<h2 id="goal-title" tabindex="-1">{t('goal.title')}</h2>
			<p class="sub">{t('goal.help', {count: MAX_DECLARATIONS_PER_DAY})}</p>
		</div>
	</header>

	<!-- Named by the title alone, and described by the rest: a name that read
	out the whole description would be long to hear on every visit. -->
	<fieldset class="goals" aria-labelledby="goal-title" disabled={isByHand}>
		{#each GOALS as goal (goal)}
			<label class="goal" class:checked={planner.goal === goal}>
				<input
					type="radio"
					name="goal"
					value={goal}
					checked={planner.goal === goal}
					aria-labelledby="{id}-{goal}"
					aria-describedby="{id}-{goal}-desc"
					onchange={() => planner.setGoal(goal)}
				/>
				<span class="title" id="{id}-{goal}">{goalLabel(goal)}</span>
				<span class="desc" id="{id}-{goal}-desc">{descriptions[goal]()}</span>
			</label>
		{/each}
	</fieldset>

	<!-- Played days drop the guild order: see `buildModel`. -->
	<Switch
		checked={planner.fillMap}
		disabled={isByHand}
		title={t('goal.fillMap')}
		description={planner.played.length > 0
			? t('goal.fillMap.description.played')
			: t('goal.fillMap.description', {guild: playing[0]!})}
		onchange={isOn => planner.setFillMap(isOn)}
	/>

	<!-- Only while the guild order applies: see `guildOrders`. -->
	{#if planner.fillMap && planner.played.length === 0 && playing.length > 1}
		<!-- Indented: it belongs to the option above. -->
		<Switch
			--switch-margin="-4px 0 16px 24px"
			checked={planner.castleLast}
			disabled={isByHand}
			title={t('goal.castleLast')}
			description={t('goal.castleLast.description', {
				first: playing[0]!,
				last: playing.at(-1)!,
			})}
			onchange={isOn => planner.setCastleLast(isOn)}
		/>
	{/if}

	<details class="advanced" bind:open={isAdvancedOpen}>
		<summary>{t('advanced.title')}</summary>
		<AdvancedOptions {planner} />
	</details>

	<details class="ranking">
		<summary>{t('ranking.title')}</summary>
		<ol>
			{#each [...priorities(planner.settings), ...refinements(planner.settings)] as criterion, i (i)}
				<li>{describeCriterion(criterion)}</li>
			{/each}
			{#each efforts(planner.settings) as effort (effort)}
				<li>{describeEffort(effort)}</li>
			{/each}
		</ol>
		<p>{t('ranking.note')}</p>
	</details>

	{#if isSolving}
		<SolveProgress {planner} />
	{:else}
		<!-- Before the button, so it is read before anyone plans again for
		nothing, or forgets to change the setup first. -->
		{#if planner.isBest}
			<p class="notice warning" id="{id}-best">
				<Icon name="alert" />
				{t(
					isByHand
						? 'solve.alreadyBest.targets'
						: (planner.fillMap ? 'solve.alreadyBest.fillMap' : 'solve.alreadyBest'),
				)}
			</p>
		{/if}
		<button
			class="btn primary find"
			{@attach focusFallback()}
			disabled={!planner.status.complete}
			aria-describedby={planner.isBest ? `${id}-best` : undefined}
			onclick={() => planner.findPlan()}
		>
			<Icon name="spark" />
			{t(isUpToDate ? 'solve.again' : 'solve.find')}
		</button>
		{#if !planner.status.complete}
			<p class="hint">{t('solve.needsSetup')}</p>
		{/if}
		{#if failure}
			<p class="notice danger" role="alert">
				<Icon name="alert" />
				{describeFailure(failure)}
			</p>
		{/if}
	{/if}
</section>

<style>
	.goals {
		display: grid;
		gap: 8px;
		min-inline-size: 0;
		margin: 0 0 16px;
		padding: 0;
		border: 0;
	}

	.goal {
		display: grid;
		padding-block: 12px;
		padding-inline: 48px 16px;
		border: 2px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		position: relative;
		transition:
			border-color 0.15s,
			background 0.15s;
	}

	.goals:disabled .goal {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.goal.checked {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	.goal input {
		position: absolute;
		inset-inline-start: 16px;
		/* Centred on the first line of the title. */
		top: 14px;
		width: 20px;
		height: 20px;
		margin: 0;
		accent-color: var(--accent);
	}

	.title {
		font-weight: 700;
	}

	.desc {
		color: var(--muted);
		font-size: 0.9rem;
	}

	.find {
		width: 100%;
		min-height: 56px;
		font-size: 1.05rem;
	}

	.ranking,
	.advanced {
		margin: -8px 0 16px;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.ranking summary,
	.advanced summary {
		width: fit-content;
		padding: 4px 0;
		color: var(--accent);
		font-weight: 600;
		cursor: pointer;
	}

	.ranking ol {
		margin: 8px 0;
		padding-inline-start: 1.4em;
	}

	.ranking p {
		margin: 0;
	}

	.hint {
		margin: 8px 0 0;
		text-align: center;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.notice.danger {
		margin: 12px 0 0;
	}

	.notice.warning {
		margin: 0 0 12px;
	}
</style>
