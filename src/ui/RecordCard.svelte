<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<!--
  Recording how days actually went, one at a time, so the rest of the week
  can be planned again from there.
-->
<script lang="ts">
	import {currentDay} from '../domain/calendar.ts';
	import type {Kingdom} from '../domain/map.ts';
	import {dayBetween, followPlan, type Ownership} from '../domain/plan.ts';
	import {GUILDS, type GuildIndex} from '../domain/types.ts';
	import {describeFailure, describeViolation, mapName} from '../i18n/describe.ts';
	import {list, t, weekday} from '../i18n/i18n.svelte.ts';
	import type {PlannerState} from '../state/planner.svelte.ts';
	import {focusFallback} from './focus.ts';
	import GuildMark from './GuildMark.svelte';
	import Icon from './Icon.svelte';
	import MapCanvas from './MapCanvas.svelte';
	import SolveProgress from './SolveProgress.svelte';

	interface Props {
		planner: PlannerState;
		/**
		Show solving progress here, when the goal card with its own is hidden.
		*/
		showProgress: boolean;
	}
	let {planner, showProgress}: Props = $props();

	/**
	The end of the day being recorded, and the position it started from:
	a draft made before the setup changed is dropped.
	*/
	let draft = $state.raw<{readonly before: Ownership; readonly owners: Ownership}>();
	let brush = $state<GuildIndex>(0);

	const before = $derived(planner.history.at(-1)!);
	const day = $derived(planner.nextDay);
	const owners = $derived(draft?.before === before ? draft.owners : undefined);
	const check = $derived(
		owners && day !== undefined ? dayBetween(planner.map, before, owners, day) : undefined,
	);
	const changed = $derived(
		new Set(owners?.flatMap((owner, i) => (owner === before[i] ? [] : [i]))),
	);
	const isSolving = $derived(planner.solve.phase === 'solving');
	const failure = $derived(planner.solve.phase === 'failed' ? planner.solve : undefined);
	const playedDays = $derived(planner.played.map((_, i) => weekday(i + 1, 'long')));

	/**
	The last day to record as planned: the one picked, or else yesterday by
	the device's clock, the last day most likely over, within the days that
	can be.
	*/
	let picked = $state<number>();
	const lastPlanned = $derived(planner.lastPlannedDay);
	const asPlannedDays = $derived(
		day !== undefined && lastPlanned !== undefined
			? Array.from({length: lastPlanned - day + 1}, (_, i) => day + i)
			: [],
	);
	const yesterday = currentDay(new Date()) - 1;
	const until = $derived(Math.min(Math.max(picked ?? yesterday, day ?? 1), lastPlanned ?? 1));

	function start(next: number) {
		// Start from the plan for that day, as far as it still fits.
		const planned = planner.result?.plan.declarations[next - 1] ?? [];
		draft = {before, owners: followPlan(planner.map, before, planned)};
	}

	function select(kingdom: Kingdom) {
		if (!owners) {
			return;
		}

		const next = [...owners];
		next[kingdom.index] = owners[kingdom.index] === brush ? before[kingdom.index]! : brush;
		draft = {before, owners: next};
	}

	function save() {
		if (!owners) {
			return;
		}

		planner.recordDay(owners);
		draft = undefined;
	}
</script>

<section class="card record" aria-labelledby="record-title">
	<header class="card-head">
		<div>
			<h2 id="record-title" tabindex="-1">{t('record.title')}</h2>
			<p class="sub">{t('record.help')}</p>
		</div>
	</header>

	{#if playedDays.length > 0}
		<p class="played">
			<Icon name="check" />
			{t('record.recorded', {days: list(playedDays)})}
		</p>
	{/if}

	{#if owners && day !== undefined}
		<p class="sub">{t('record.editHelp', {day: weekday(day, 'long')})}</p>
		<div class="brush" role="group" aria-label={t('record.guilds')}>
			{#each GUILDS as g (g)}
				<button
					class="chip"
					{@attach focusFallback()}
					aria-pressed={brush === g}
					aria-label={t('record.assign', {guild: planner.displayNames[g]!})}
					onclick={() => (brush = g)}
				>
					<GuildMark guild={g} size={16} /><span class="name">{planner.displayNames[g]}</span>
				</button>
			{/each}
		</div>
		<MapCanvas
			map={planner.map}
			{owners}
			guildNames={planner.displayNames}
			{changed}
			label={t('record.map', {map: mapName(planner.map), day: weekday(day, 'long')})}
			isInteractive={() => true}
			onSelect={select}
		/>
		{#if check?.violations[0]}
			<p class="notice danger" role="alert">
				<Icon name="alert" />
				{t('record.broken', {
					problem: describeViolation(planner.map, check.violations[0], planner.displayNames),
				})}
			</p>
		{/if}
		<div class="actions">
			<button class="btn primary" disabled={!check || check.violations.length > 0} onclick={save}>
				<Icon name="check" />
				{t('record.save', {day: weekday(day, 'long')})}
			</button>
			<button class="btn" onclick={() => (draft = undefined)}>{t('record.cancel')}</button>
		</div>
	{:else}
		{#if asPlannedDays.length > 0}
			<div class="as-planned">
				<label class="until">
					{t('record.until')}
					<select
						value={until}
						disabled={isSolving}
						onchange={event => (picked = Number(event.currentTarget.value))}
					>
						{#each asPlannedDays as d (d)}
							<option value={d}>{weekday(d, 'long')}</option>
						{/each}
					</select>
				</label>
				<button class="btn" disabled={isSolving} onclick={() => planner.recordAsPlanned(until)}>
					<Icon name="check" />
					{t('record.asPlanned', {day: weekday(until, 'long')})}
				</button>
			</div>
		{/if}
		<div class="actions">
			{#if day !== undefined}
				<button class="btn" {@attach focusFallback()} disabled={isSolving} onclick={() => start(day)}>
					{t('record.start', {day: weekday(day, 'long')})}
				</button>
			{/if}
			{#if playedDays.length > 0}
				<button class="btn ghost" disabled={isSolving} onclick={() => planner.forgetDay()}>
					<Icon name="reset" />
					{t('record.forget', {day: playedDays.at(-1)!})}
				</button>
			{/if}
		</div>
		{#if isSolving}
			{#if showProgress}
				<div class="progress"><SolveProgress {planner} /></div>
			{/if}
		{:else if playedDays.length > 0 && (planner.stale || !planner.result)}
			<button class="btn primary replan" {@attach focusFallback()} onclick={() => planner.findPlan()}>
				<Icon name="spark" />
				{t('record.replan')}
			</button>
		{/if}
		<!-- With the setup put away, the goal card cannot show it. -->
		{#if failure && showProgress}
			<p class="notice danger" role="alert">
				<Icon name="alert" />
				{describeFailure(failure)}
			</p>
		{/if}
	{/if}
</section>

<style>
	/* Never wider than the column, however long a guild's name. */
	.record {
		min-width: 0;
	}

	.played {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 12px;
		color: var(--success);
		font-weight: 600;
	}

	.played :global(svg) {
		flex: none;
		width: 20px;
		height: 20px;
	}

	.brush {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 12px 0;
	}

	.notice {
		margin: 12px 0 0;
	}

	.as-planned {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	.until {
		display: inline-flex;
		flex: 1 1 auto;
		align-items: center;
		gap: 8px;
		min-width: 0;
		color: var(--muted);
		font-weight: 600;
	}

	.until select {
		min-width: 0;
		min-height: 44px;
		padding: 0 12px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		color: var(--text);
		font-weight: 600;
	}

	/* The day's name makes it long: let it wrap rather than overflow. */
	.as-planned .btn {
		flex: 1 1 auto;
		min-width: 0;
		white-space: normal;
		text-align: center;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 16px;
	}

	.actions:empty {
		display: none;
	}

	.actions .btn {
		flex: 1 1 140px;
	}

	.replan,
	.progress {
		width: 100%;
		margin-top: 16px;
	}
</style>
