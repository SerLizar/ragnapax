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
	import {focusFallback} from './focus.ts';
	import GuildMark from './GuildMark.svelte';
	import Icon from './Icon.svelte';
	import SolveProgress from './SolveProgress.svelte';

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
	// Opens with the card when an advanced option is in use, so the choice
	// is in view, but never closes by itself while the player changes it.
	let isAdvancedOpen = $state(untrack(() => planner.fewestDays || planner.inactive.length > 0));
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
	<fieldset class="goals" aria-labelledby="goal-title">
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

	<label class="option">
		<input
			type="checkbox"
			role="switch"
			checked={planner.fillMap}
			aria-labelledby="{id}-fill"
			aria-describedby="{id}-fill-desc"
			onchange={event => planner.setFillMap(event.currentTarget.checked)}
		/>
		<span class="title" id="{id}-fill">{t('goal.fillMap')}</span>
		<span class="desc" id="{id}-fill-desc">
			<!-- Played days drop the guild order: see `buildModel`. -->
			{planner.played.length > 0
				? t('goal.fillMap.description.played')
				: t('goal.fillMap.description', {guild: playing[0]!})}
		</span>
	</label>

	<!-- Only while the guild order applies: see `guildOrders`. -->
	{#if planner.fillMap && planner.played.length === 0 && playing.length > 1}
		<label class="option nested">
			<input
				type="checkbox"
				role="switch"
				checked={planner.castleLast}
				aria-labelledby="{id}-castle"
				aria-describedby="{id}-castle-desc"
				onchange={event => planner.setCastleLast(event.currentTarget.checked)}
			/>
			<span class="title" id="{id}-castle">{t('goal.castleLast')}</span>
			<span class="desc" id="{id}-castle-desc">
				{t('goal.castleLast.description', {
					first: playing[0]!,
					last: playing.at(-1)!,
				})}
			</span>
		</label>
	{/if}

	<details class="advanced" bind:open={isAdvancedOpen}>
		<summary>{t('advanced.title')}</summary>
		<label class="option advanced-option">
			<input
				type="checkbox"
				role="switch"
				checked={planner.fewestDays}
				aria-labelledby="{id}-days"
				aria-describedby="{id}-days-desc"
				onchange={event => planner.setFewestDays(event.currentTarget.checked)}
			/>
			<span class="title" id="{id}-days">{t('advanced.fewestDays')}</span>
			<span class="desc" id="{id}-days-desc">{t('advanced.fewestDays.description')}</span>
		</label>
		<fieldset class="sitting-out" aria-describedby="{id}-out-desc">
			<legend class="title">{t('advanced.inactive')}</legend>
			<p class="desc" id="{id}-out-desc">{t('advanced.inactive.description')}</p>
			{#each planner.displayNames as name, g (g)}
				{@const isOut = planner.inactive.includes(g)}
				<label class="option guild">
					<input
						type="checkbox"
						role="switch"
						checked={isOut}
						disabled={!isOut && playing.length === 1}
						onchange={event => planner.setSittingOut(g, event.currentTarget.checked)}
					/>
					<span class="title"><GuildMark guild={g} size={16} /> {name}</span>
				</label>
			{/each}
			{#if playing.length === 1}
				<p class="desc">{t('advanced.inactive.last')}</p>
			{/if}
		</fieldset>
		<!-- The player's own preference rather than the group's, so it never
		opens the options by itself. -->
		<label class="option advanced-option last">
			<input
				type="checkbox"
				role="switch"
				checked={planner.townLists}
				aria-labelledby="{id}-lists"
				aria-describedby="{id}-lists-desc"
				onchange={event => planner.setTownLists(event.currentTarget.checked)}
			/>
			<span class="title" id="{id}-lists">{t('advanced.townLists')}</span>
			<span class="desc" id="{id}-lists-desc">{t('advanced.townLists.description')}</span>
		</label>
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
			<p class="warning" id="{id}-best">
				<Icon name="alert" />
				{t(planner.fillMap ? 'solve.alreadyBest.fillMap' : 'solve.alreadyBest')}
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
			<p class="error" role="alert">
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

	.option {
		display: grid;
		position: relative;
		margin: -4px 0 16px;
		padding-block: 4px;
		padding-inline: 64px 0;
		cursor: pointer;
	}

	/* Belongs to the option above it. */
	.option.nested {
		margin-inline-start: 24px;
	}

	.option input {
		position: absolute;
		inset-inline-start: 4px;
		top: 4px;
		width: 44px;
		height: 24px;
		margin: 0;
		/* Off: an outlined track and a muted knob, both clear of the card (WCAG 1.4.11). */
		border: 2px solid var(--muted);
		border-radius: 999px;
		background: var(--surface);
		appearance: none;
		-webkit-appearance: none;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.option input::after {
		content: '';
		position: absolute;
		top: 2px;
		inset-inline-start: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--muted);
		transition:
			inset-inline-start 0.15s,
			background 0.15s;
	}

	.option input:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.option input:checked {
		border-color: var(--accent);
		background: var(--accent);
	}

	.option input:checked::after {
		background: var(--surface);
		/* Towards the end of the line, whichever way the language writes. */
		inset-inline-start: 22px;
	}

	/* Forced colours drop backgrounds: draw the switch in system colours. */
	@media (forced-colors: active) {
		.option input {
			forced-color-adjust: none;
			border-color: CanvasText;
			background: Canvas;
		}

		.option input::after {
			background: CanvasText;
		}

		.option input:checked {
			border-color: Highlight;
			background: Highlight;
		}

		.option input:checked::after {
			background: HighlightText;
		}
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

	/* Reads like the options outside the disclosure. */
	.advanced-option {
		margin: 8px 0 16px;
		color: var(--text);
		font-size: 1rem;
	}

	.advanced-option.last {
		margin: 16px 0 0;
	}

	.sitting-out {
		display: grid;
		gap: 8px;
		min-inline-size: 0;
		margin: 8px 0 0;
		padding: 0;
		border: 0;
		color: var(--text);
		font-size: 1rem;
	}

	.sitting-out legend {
		padding: 0;
	}

	.sitting-out p {
		margin: 0;
	}

	.option.guild {
		margin: 0;
	}

	.option.guild .title {
		display: flex;
		gap: 8px;
		align-items: center;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.hint {
		margin: 8px 0 0;
		text-align: center;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.error,
	.warning {
		display: flex;
		gap: 8px;
		align-items: flex-start;
		margin: 12px 0 0;
		padding: 12px;
		border-radius: var(--radius-sm);
		background: var(--danger-soft);
		color: var(--danger);
		font-weight: 600;
	}

	.warning {
		margin: 0 0 12px;
		background: var(--warning-soft);
		color: var(--warning);
	}

	.error :global(svg),
	.warning :global(svg) {
		flex: none;
		width: 20px;
		height: 20px;
	}
</style>
