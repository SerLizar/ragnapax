<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<script lang="ts">
	import type {GuildScore} from '../domain/plan.ts';
	import {activeGuilds, type PlanSettings} from '../domain/settings.ts';
	import {rich, t} from '../i18n/i18n.svelte.ts';
	import GuildMark from './GuildMark.svelte';
	import Rich from './Rich.svelte';

	interface Props {
		scores: readonly GuildScore[];
		guildNames: readonly string[];
		settings: PlanSettings;
	}
	let {scores, guildNames, settings}: Props = $props();
	const goal = $derived(settings.goal);

	/**
	The number columns: messages `score.<name>Short` and `score.<name>Long`, and
	the goal they matter to, whose columns are emphasised.
	*/
	const COLUMNS = [
		{name: 'points', goal: 'points'},
		{name: 'town', goal: 'resources'},
		{name: 'dorm', goal: 'resources'},
		{name: 'castle', goal: 'resources'},
		{name: 'declares', goal: undefined},
	] as const;

	// The headline is about the share, which guilds sitting out are not part of.
	const playing = $derived(activeGuilds(settings).map(g => ({g, s: scores[g]!})));
	const spread = (f: (s: GuildScore) => number) =>
		Math.max(...playing.map(({s}) => f(s))) - Math.min(...playing.map(({s}) => f(s)));
	const best = $derived(Math.max(...playing.map(({s}) => s.points)));
	const least = $derived(Math.min(...playing.map(({s}) => s.points)));
	// Guilds that came out ahead when the map could not be split evenly.
	const extras = $derived(
		playing
			.map(({g, s}) => ({name: guildNames[g]!, extra: s.points - least}))
			.filter(entry => entry.extra > 0),
	);
	const isEven = $derived(
		(goal === 'points'
			? spread(s => s.points)
			: spread(s => s.held.town)
				+ spread(s => s.held.dormitory)
				+ spread(s => s.held.castle)) === 0,
	);
</script>

<!-- Headings are abbreviated on screen; screen readers get them in full,
since few read an abbreviation's title. -->
<div class="scoreboard">
	{#if isEven}
		<p class="headline">
			{#if goal === 'points'}
				<Rich parts={rich('score.points', {count: best})} />
			{:else}
				<Rich
					parts={rich('score.holdings', {
						towns: t('score.townDays', {count: playing[0]!.s.held.town}),
						dorms: t('score.dormDays', {count: playing[0]!.s.held.dormitory}),
						castle: t('score.castleDays', {count: playing[0]!.s.held.castle}),
					})}
				/>
			{/if}
		</p>
	{:else if settings.fillMap}
		<p class="headline">
			{#if goal === 'points'}
				<Rich
					parts={rich('score.fillPoints', {
						count: least,
						extras: extras
							.map(entry => t('score.extra', {guild: entry.name, count: entry.extra}))
							.join(t('list.separator')),
					})}
				/>
			{:else}
				{t('score.fillResources')}
			{/if}
		</p>
	{:else}
		<p class="headline uneven">
			{#if goal === 'points'}
				<Rich parts={rich('score.pointsUneven', {least, most: best})} />
			{:else}
				{t('score.holdingsUneven')}
			{/if}
		</p>
	{/if}
	<table>
		<thead>
			<tr>
				<th scope="col" class="name">{t('score.guild')}</th>
				{#each COLUMNS as column (column.name)}
					<th scope="col" class:key={column.goal === goal}>
						<abbr title={t(`score.${column.name}Long`)} aria-hidden="true">
							{t(`score.${column.name}Short`)}
						</abbr><span class="visually-hidden">{t(`score.${column.name}Long`)}</span>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each scores as s, g (g)}
				<tr>
					<th scope="row" class="name">
						<span class="who">
							<GuildMark guild={g} size={16} />
							<span class="text">
								{guildNames[g]}
								{#if settings.inactive.includes(g)}
									<span class="out">{t('score.inactive')}</span>
								{/if}
							</span>
						</span>
					</th>
					<td class:key={goal === 'points'}>{s.points}</td>
					<td class:key={goal === 'resources'}>{s.held.town}</td>
					<td class:key={goal === 'resources'}>{s.held.dormitory}</td>
					<td class:key={goal === 'resources'}>{s.held.castle}</td>
					<td>{s.declarations}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.headline {
		margin: 0 0 12px;
		padding: 12px;
		border-radius: var(--radius-sm);
		background: var(--success-soft);
		color: var(--success);
	}

	/* Not a success: plain text, the table says the rest. */
	.headline.uneven {
		background: var(--surface-2);
		color: var(--text);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
	}

	th,
	td {
		padding-block: 8px;
		padding-inline: 8px 0;
		text-align: end;
		white-space: nowrap;
		border-bottom: 1px solid var(--border);
	}

	thead th {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	abbr {
		text-decoration: none;
	}

	tbody tr:last-child > * {
		border-bottom: 0;
	}

	/* The name column takes the room the numbers leave, down to nothing. */
	.name {
		width: 100%;
		max-width: 0;
		padding-inline-start: 0;
		text-align: start;
	}

	.who {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
	}

	/* Long names wrap rather than widen the table. */
	.text {
		min-width: 0;
		overflow-wrap: anywhere;
		white-space: normal;
	}

	/* Compact headings leave the smallest phones room for guild names. */
	@media (max-width: 359px) {
		th,
		td {
			padding-inline-start: 4px;
		}

		thead th {
			font-size: 0.65rem;
			letter-spacing: 0;
		}
	}

	.out {
		display: block;
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 400;
	}

	td.key {
		font-weight: 700;
	}

	thead .key {
		color: var(--text);
	}
</style>
