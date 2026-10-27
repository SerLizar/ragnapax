<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<script lang="ts">
	import {currentDay, dayOfRagnarok} from '../domain/calendar.ts';
	import type {GameMap} from '../domain/map.ts';
	import {capturesOn, type GuildScore, type Timeline} from '../domain/plan.ts';
	import type {GuildIndex} from '../domain/types.ts';
	import {mapName} from '../i18n/describe.ts';
	import {t, weekday} from '../i18n/i18n.svelte.ts';
	import Declares from './Declares.svelte';
	import {focusFallback} from './focus.ts';
	import {guildStyle} from './guilds.ts';
	import GuildMark from './GuildMark.svelte';
	import Icon from './Icon.svelte';
	import MapCanvas from './MapCanvas.svelte';
	import WeekOverview from './WeekOverview.svelte';

	interface Props {
		map: GameMap;
		timeline: Timeline;
		scores: readonly GuildScore[];
		guildNames: readonly string[];
		/**
		Guilds sitting out, left out of the whole week's list.
		*/
		inactive?: readonly GuildIndex[];
		/**
		How many days, from Wednesday, are what happened rather than a plan.
		*/
		played?: number;
		/**
		Guild to focus on, shared with the copy action; undefined for everyone.
		*/
		focus: GuildIndex | undefined;
	}
	let {
		map, timeline, scores, guildNames, inactive = [], played = 0, focus = $bindable(),
	}: Props = $props();
	const id = $props.id();

	/**
	A day at a time on the map, or every day's declares in one list.
	*/
	let view = $state<'day' | 'week'>('day');

	// Players mostly look during the week for that day's declares.
	const opened = new Date();
	let day = $state(currentDay(opened));
	/**
	Which day is today, marked as such. Players switch to the game and back,
	and a tab can stay open for days, so it is rechecked whenever the page
	comes back into view; the day being looked at stays put.
	*/
	let today = $state(dayOfRagnarok(opened));
	$effect(() => {
		const recheck = () => {
			if (document.visibilityState === 'visible') {
				today = dayOfRagnarok(new Date());
			}
		};

		document.addEventListener('visibilitychange', recheck);
		return () => {
			document.removeEventListener('visibilitychange', recheck);
		};
	});
	const days = $derived(timeline.owners.length - 1);
	// A new plan may cover fewer days.
	$effect(() => {
		if (day > days) {
			day = days;
		}
	});
	const captures = $derived(capturesOn(timeline, day));
	const changed = $derived(new Set(captures.map(c => c.kingdom)));
	const shown = $derived(focus === undefined ? guildNames.map((_, g) => g) : [focus]);
	const runningTotal = (g: GuildIndex) =>
		scores[g]!.pointsByDay.slice(0, day).reduce((a, b) => a + b, 0);

	function keydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowLeft': {
				day = Math.max(0, day - 1);
				break;
			}

			case 'ArrowRight': {
				day = Math.min(days, day + 1);
				break;
			}

			case 'Home': {
				day = 0;
				break;
			}

			case 'End': {
				day = days;
				break;
			}

			default: {
				return;
			}
		}

		event.preventDefault();
		(event.currentTarget as HTMLElement)
			.querySelector<HTMLElement>(`[data-day="${CSS.escape(String(day))}"]`)
			?.focus();
	}
</script>

<div class="explorer">
	<div class="view" role="group" aria-label={t('days.view')}>
		<button aria-pressed={view === 'day'} onclick={() => (view = 'day')}>{t('days.byDay')}</button>
		<button aria-pressed={view === 'week'} onclick={() => (view = 'week')}>{t('days.week')}</button>
	</div>

	<!-- Toggle buttons: pressing the guild shown again shows every guild. -->
	<div class="focus" role="group" aria-label={t('days.focus')}>
		<button
			class="chip"
			aria-pressed={focus === undefined}
			onclick={() => (focus = undefined)}
		>
			{t('days.all')}
		</button>
		{#each guildNames as name, g (g)}
			<button
				class="chip"
				aria-pressed={focus === g}
				onclick={() => (focus = focus === g ? undefined : g)}
			>
				<GuildMark guild={g} size={16} /><span class="name">{name}</span>
			</button>
		{/each}
	</div>

	{#if view === 'week'}
		<WeekOverview {map} {timeline} {guildNames} {inactive} {played} {today} {focus} />
	{:else}
		<div class="days">
			<button
				class="step"
				aria-label={t('days.previous')}
				disabled={day === 0}
				onclick={() => (day -= 1)}
			>
				<Icon name="left" />
			</button>
			<div class="tabs" role="tablist" aria-label={t('days.tabs')} tabindex="-1" onkeydown={keydown}>
				{#each {length: days + 1} as _, d (d)}
					<button
						class="day"
						role="tab"
						data-day={d}
						aria-controls="{id}-day"
						aria-selected={day === d}
						aria-current={d === today ? 'date' : undefined}
						{@attach focusFallback(day === d)}
						tabindex={day === d ? 0 : -1}
						aria-label={d === 0
							? t('days.start')
							: t('label.shortened', {short: weekday(d, 'short'), full: weekday(d, 'long')})}
						onclick={() => (day = d)}
					>
						{d === 0 ? t('days.start') : weekday(d, 'short')}
					</button>
				{/each}
			</div>
			<button
				class="step"
				aria-label={t('days.next')}
				disabled={day === days}
				onclick={() => (day += 1)}
			>
				<Icon name="right" />
			</button>
		</div>

		<div role="tabpanel" id="{id}-day" aria-label={day === 0 ? t('days.startTitle') : weekday(day, 'long')}>
			<MapCanvas
				{map}
				owners={timeline.owners[day]!}
				{guildNames}
				{changed}
				{focus}
				label={day === 0
					? t('days.mapStart', {map: mapName(map)})
					: t('days.mapEnd', {map: mapName(map), day: weekday(day, 'long')})}
			/>

			{#if day === 0}
				<p class="empty">{t('days.startNote')}</p>
			{:else}
				{#if day <= played}
					<p class="empty">{t('days.played')}</p>
				{/if}
				<ul class="moves">
					{#each shown as g (g)}
						{@const mine = captures.filter(c => c.guild === g)}
						<li style:--guild={guildStyle(g).fill}>
							<div class="who">
								<GuildMark guild={g} size={16} />
								<strong>{guildNames[g]}</strong>
								<span class="pts" title={t('days.pointsTitle')}>
									{t('days.points', {
										today: scores[g]!.pointsByDay[day - 1]!,
										total: runningTotal(g),
									})}
								</span>
							</div>
							<Declares {map} captures={mine} {guildNames} />
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Columns never grow past the card, however long a guild's name. */
	.explorer,
	.moves {
		grid-template-columns: minmax(0, 1fr);
	}

	.explorer {
		display: grid;
		gap: 12px;
	}

	/* Chips wrap rather than scroll: a row cut off at the card's edge hid the
	last guilds, with nothing to say there were more. */
	.focus {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		max-width: min(14em, 100%);
		min-height: 36px;
		padding: 0 12px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		font-size: 0.9rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.chip .name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chip :global(.mark) {
		flex: none;
	}

	.chip[aria-pressed='true'] {
		border-color: var(--text);
		background: var(--text);
		color: var(--surface);
	}

	/* Forced colours drop backgrounds: mark the pressed one in the system's
	highlight instead. */
	@media (forced-colors: active) {
		.chip[aria-pressed='true'] {
			forced-color-adjust: none;
			border-color: Highlight;
			background: Highlight;
			color: HighlightText;
		}
	}

	.view,
	.days {
		display: flex;
		gap: 4px;
		padding: 4px;
		border-radius: 999px;
		background: var(--surface-2);
	}

	.tabs {
		display: flex;
		flex: 1;
		gap: 4px;
		min-width: 0;
	}

	.view button,
	.days button {
		flex: 1;
		min-width: 0;
		min-height: 40px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: transparent;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--muted);
		white-space: nowrap;
	}

	.view [aria-pressed='true'],
	.days .day[aria-selected='true'] {
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow);
	}

	@media (forced-colors: active) {
		.view [aria-pressed='true'],
		.days .day[aria-selected='true'] {
			forced-color-adjust: none;
			background: Highlight;
			color: HighlightText;
		}
	}

	/* Today's tab, by the device's calendar. */
	/* Longer translations may need two lines. */
	.view button {
		padding: 4px 8px;
		white-space: normal;
	}

	.days .day[aria-current='date'] {
		text-decoration: underline 2px var(--accent);
		text-underline-offset: 4px;
	}

	.days .day:first-of-type {
		flex: 1.3;
	}

	.days .step {
		flex: none;
		display: grid;
		place-items: center;
		width: 40px;
	}

	.days .step:disabled {
		opacity: 0.3;
	}

	/* Weekday names need the room on phones, where every day is in reach anyway. */
	@media (max-width: 479px) {
		.days .step {
			display: none;
		}
	}

	@media (max-width: 359px) {
		.days,
		.tabs {
			gap: 0;
		}

		.days button {
			font-size: 0.85rem;
		}
	}

	.days :global(svg) {
		width: 20px;
		height: 20px;
	}

	.empty {
		margin: 12px 0 0;
		color: var(--muted);
		text-align: center;
	}

	.moves {
		display: grid;
		gap: 8px;
		margin: 12px 0 0;
		padding: 0;
		list-style: none;
	}

	.moves > li {
		padding: 12px;
		border-inline-start: 4px solid var(--guild);
		border-radius: var(--radius-sm);
		background: var(--surface-2);
	}

	.who {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.who strong {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pts {
		flex: none;
		color: var(--muted);
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
	}
</style>
