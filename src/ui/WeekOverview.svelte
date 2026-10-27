<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<!--
  Every day's declares on one screen, as the plan copied as text lists them,
  for players who want the whole week at a glance rather than a day at a time.
-->
<script lang="ts">
	import type {GameMap} from '../domain/map.ts';
	import {capturesOn, guildsListed, type Timeline} from '../domain/plan.ts';
	import type {GuildIndex} from '../domain/types.ts';
	import {t, weekday} from '../i18n/i18n.svelte.ts';
	import Declares from './Declares.svelte';
	import {guildStyle} from './guilds.ts';
	import GuildMark from './GuildMark.svelte';

	interface Props {
		map: GameMap;
		timeline: Timeline;
		guildNames: readonly string[];
		inactive: readonly GuildIndex[];
		/**
		How many days, from Wednesday, are what happened rather than a plan.
		*/
		played: number;
		/**
		Day of the Ragnarok by the device's calendar, marked as today.
		*/
		today: number;
		focus: GuildIndex | undefined;
	}
	let {map, timeline, guildNames, inactive, played, today, focus}: Props = $props();

	const days = $derived(
		Array.from({length: timeline.owners.length - 1}, (_, index) => {
			const day = index + 1;
			const captures = capturesOn(timeline, day);
			// As in the text: guilds sitting out are left out of days they do nothing.
			const guilds = focus === undefined ? guildsListed(captures, inactive) : [focus];
			return {day, captures, guilds};
		}),
	);
</script>

<ol class="week">
	{#each days as {day, captures, guilds} (day)}
		<li aria-current={day === today ? 'date' : undefined}>
			<h3>
				<span class="name">{weekday(day, 'long')}</span>
				{#if day === today}
					<span class="tag today">{t('days.today')}</span>
				{/if}
				{#if day <= played}
					<span class="tag">{t('days.playedTag')}</span>
				{/if}
			</h3>
			<ul class="moves">
				{#each guilds as g (g)}
					<li style:--guild={guildStyle(g).fill}>
						<span class="who">
							<GuildMark guild={g} size={16} />
							<strong>{guildNames[g]}</strong>
						</span>
						<Declares {map} captures={captures.filter(c => c.guild === g)} {guildNames} />
					</li>
				{/each}
			</ul>
		</li>
	{/each}
</ol>

<style>
	.week {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 16px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	h3 {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin: 0 0 8px;
		font-size: 1rem;
	}

	/* Today, by the device's calendar, as the day tabs mark it. */
	[aria-current='date'] .name {
		text-decoration: underline 2px var(--accent);
		text-underline-offset: 4px;
	}

	.tag {
		padding: 4px 8px;
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.tag.today {
		background: var(--accent-soft);
		color: var(--text);
	}

	.moves {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* A guild's name and its declares on one line where they fit. */
	.moves > li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 12px;
		padding: 8px 12px;
		border-inline-start: 4px solid var(--guild);
		border-radius: var(--radius-sm);
		background: var(--surface-2);
	}

	.moves > li > :global(*) {
		margin: 0;
	}

	.who {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		max-width: 100%;
	}

	.who :global(.mark) {
		flex: none;
	}

	.who strong {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
