<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<script lang="ts">
	import {
		GOALS,
		priorities,
		refinements,
		type Goal,
	} from '../domain/settings.ts';
	import {MAX_DECLARATIONS_PER_DAY, POINTS} from '../domain/types.ts';
	import {describeCriterion, describeFailure, goalLabel} from '../i18n/describe.ts';
	import {t} from '../i18n/i18n.svelte.ts';
	import type {PlannerState} from '../state/planner.svelte.ts';
	import {focusFallback} from './focus.ts';
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
				: t('goal.fillMap.description', {guild: planner.displayNames[0]!})}
		</span>
	</label>

	<details class="ranking">
		<summary>{t('ranking.title')}</summary>
		<ol>
			{#each [...priorities(planner.settings), ...refinements(planner.settings)] as criterion, i (i)}
				<li>{describeCriterion(criterion)}</li>
			{/each}
			<li>{t('ranking.declarations')}</li>
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

	.ranking {
		margin: -8px 0 16px;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.ranking summary {
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
