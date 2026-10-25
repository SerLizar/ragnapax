<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<script lang="ts">
	import type {Kingdom} from '../domain/map.ts';
	import {GUILD_COUNT, TOWNS_PER_GUILD, type GuildIndex} from '../domain/types.ts';
	import {defaultGuildName, mapName, kingdomName} from '../i18n/describe.ts';
	import {list, t} from '../i18n/i18n.svelte.ts';
	import type {PlannerState} from '../state/planner.svelte.ts';
	import {focusFallback, SETUP_TITLE} from './focus.ts';
	import {guildStyle} from './guilds.ts';
	import GuildMark from './GuildMark.svelte';
	import Icon from './Icon.svelte';
	import MapCanvas from './MapCanvas.svelte';

	let {planner}: {planner: PlannerState} = $props();

	let brush = $state(0);
	const map = $derived(planner.map);
	const status = $derived(planner.status);
	const assigned = $derived(status.counts.reduce((a, b) => a + b, 0));
	const needed = GUILD_COUNT * TOWNS_PER_GUILD;
	// Days were played from these towns, or a plan is being found for them.
	const lock = $derived(planner.townLock);

	function select(town: Kingdom) {
		planner.warmUpSolver();
		planner.toggleTown(town.id, brush);
		// Move on to the next guild that still needs towns.
		if (planner.status.counts[brush] === TOWNS_PER_GUILD) {
			for (let i = 1; i < GUILD_COUNT; i++) {
				const next = (brush + i) % GUILD_COUNT;
				if (planner.status.counts[next]! < TOWNS_PER_GUILD) {
					brush = next;
					break;
				}
			}
		}
	}

	/**
	Keeps a name to the game's length as it is typed, counting characters as
	players see them, which `maxlength` cannot. Not while a word is being
	composed, as Japanese and Chinese keyboards do: cutting it would break it.
	*/
	function rename(event: Event & {currentTarget: HTMLInputElement}, guild: GuildIndex) {
		if (event instanceof InputEvent && event.isComposing) {
			return;
		}

		const input = event.currentTarget;
		const kept = planner.setGuildName(guild, input.value);
		if (input.value === kept) {
			return;
		}

		const caret = Math.min(input.selectionStart ?? kept.length, kept.length);
		input.value = kept;
		input.setSelectionRange(caret, caret);
	}

	const vacantNames = $derived(status.vacant.map(i => kingdomName(map.kingdoms[i]!)));
</script>

<section class="card" aria-labelledby={SETUP_TITLE}>
	<header class="card-head">
		<div>
			<h2 id={SETUP_TITLE} tabindex="-1">{t('setup.title')}</h2>
			<p class="sub">{t('setup.help', {count: TOWNS_PER_GUILD})}</p>
		</div>
		<button
			class="btn ghost small"
			onclick={() => {
				planner.clearTowns();
				brush = 0;
			}}
			disabled={assigned === 0 || lock !== undefined}
		>
			<Icon name="reset" />
			{t('setup.clear')}
		</button>
	</header>

	<div class="guilds" role="group" aria-label={t('setup.guilds')}>
		{#each planner.guildNames as _, g (g)}
			{@const color = guildStyle(g)}
			{@const count = status.counts[g] ?? 0}
			{@const isFull = count === TOWNS_PER_GUILD}
			<div class="guild" class:active={brush === g} style:--guild={color.fill}>
				<button
					class="pick"
					{@attach focusFallback()}
					aria-pressed={brush === g}
					aria-label={t('setup.assign', {guild: planner.displayNames[g]!})}
					onclick={() => (brush = g)}
				>
					<GuildMark guild={g} size={36}>
						{#if isFull}<Icon name="check" />{:else}{g + 1}{/if}
					</GuildMark>
				</button>
				<input
					aria-label={t('setup.guildName', {number: g + 1})}
					value={planner.guildNames[g]}
					oninput={event => rename(event, g)}
					oncompositionend={event => rename(event, g)}
					placeholder={defaultGuildName(g)}
					onfocus={() => (brush = g)}
					onblur={() => planner.finishGuildName(g)}
					autocomplete="off"
					spellcheck="false"
				/>
				<!-- A plain span cannot carry a label, so the spoken text is separate. -->
				<span class="count" class:full={isFull} class:over={count > TOWNS_PER_GUILD}>
					<span aria-hidden="true">{count}/{TOWNS_PER_GUILD}</span>
					<span class="visually-hidden">
						{t('setup.townCount', {count, total: TOWNS_PER_GUILD})}
					</span>
				</span>
			</div>
		{/each}
	</div>

	<MapCanvas
		{map}
		owners={planner.start}
		guildNames={planner.displayNames}
		label={t('setup.map', {map: mapName(map)})}
		isInteractive={kingdom => kingdom.kind === 'town' && lock === undefined}
		onSelect={select}
	/>

	{#if lock}
		<p class="locked">
			{#if lock === 'played'}
				{t('setup.locked')}
			{:else}
				{t(planner.solve.phase === 'solving' && planner.solve.found ? 'setup.lockedChecking' : 'setup.lockedSearching')}
			{/if}
		</p>
	{/if}
	<p class="progress" class:done={status.complete} aria-live="polite">
		{#if status.complete}
			<Icon name="check" />
			{t('setup.done')}
			{#if vacantNames.length}
				{t('setup.vacant', {count: vacantNames.length, kingdoms: list(vacantNames)})}
			{/if}
		{:else}
			{t('setup.progress', {count: assigned, total: needed})}
			{#each status.counts as count, g (g)}
				{#if count > TOWNS_PER_GUILD}
					<strong class="over">
						{t('setup.tooMany', {
							guild: planner.displayNames[g]!,
							count: count - TOWNS_PER_GUILD,
						})}
					</strong>
				{/if}
			{/each}
		{/if}
	</p>
</section>

<style>
	.guilds {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 8px;
		margin-bottom: 12px;
	}

	.guild {
		position: relative;
		isolation: isolate;
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
		padding-block: 4px;
		padding-inline: 4px 12px;
		border: 2px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.guild.active {
		border-color: var(--guild);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--guild) 22%, transparent);
	}

	/* Forced colours make every border alike: outline the selected guild. */
	@media (forced-colors: active) {
		.guild.active {
			outline: 3px solid Highlight;
			outline-offset: 2px;
		}
	}

	.pick {
		flex: none;
		padding: 0;
		border: 0;
		background: none;
		border-radius: 50%;
	}

	/* A tap anywhere on the pill, padding and count included, picks the guild;
	the name stays on top to be typed in. */
	.pick::after {
		content: '';
		position: absolute;
		inset: -2px;
		border-radius: 999px;
	}

	.pick :global(.content) {
		font-size: 0.9rem;
	}

	.pick :global(.content svg) {
		width: 16px;
		height: 16px;
	}

	input {
		position: relative;
		z-index: 1;
		flex: 1;
		min-width: 0;
		height: 32px;
		padding: 0 4px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		font-weight: 600;
		text-overflow: ellipsis;
	}

	input:focus {
		outline: 2px solid var(--accent);
		outline-offset: 0;
		background: var(--surface-2);
	}

	.count {
		flex: none;
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}

	.count.full {
		color: var(--success);
		font-weight: 700;
	}

	.count.over {
		color: var(--danger);
		font-weight: 700;
	}

	.locked {
		margin: 12px 0 0;
		color: var(--muted);
		font-size: 0.95rem;
	}

	.progress {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin: 12px 0 0;
		color: var(--muted);
		font-size: 0.95rem;
	}

	.progress.done {
		color: var(--success);
		font-weight: 600;
	}

	.progress .over {
		color: var(--danger);
	}

	.progress :global(svg) {
		width: 20px;
		height: 20px;
	}
</style>
