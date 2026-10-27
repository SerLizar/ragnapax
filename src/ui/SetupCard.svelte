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
	const id = $props.id();

	let brush = $state(0);
	const map = $derived(planner.map);
	const status = $derived(planner.status);
	const assigned = $derived(status.counts.reduce((a, b) => a + b, 0));
	const needed = GUILD_COUNT * TOWNS_PER_GUILD;
	// Days were played from these towns, or a plan is being found for them.
	const lock = $derived(planner.townLock);
	// Set from lists rather than on the map: see `PlannerState.townLists`.
	const hasLists = $derived(planner.townLists);
	// Guilds only start with towns; by letter, as players list them.
	const towns = $derived(
		map.towns.map(i => map.kingdoms[i]!).toSorted((a, b) => a.id.localeCompare(b.id)),
	);

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

	function assign(town: Kingdom, value: string) {
		planner.warmUpSolver();
		planner.assignTown(town.id, value === '' ? undefined : (Number(value) as GuildIndex));
	}

	const vacantNames = $derived(status.vacant.map(i => kingdomName(map.kingdoms[i]!)));
</script>

<section class="card" aria-labelledby={SETUP_TITLE}>
	<header class="card-head">
		<div>
			<h2 id={SETUP_TITLE} tabindex="-1">{t('setup.title')}</h2>
			<p class="sub">{t(hasLists ? 'setup.help.lists' : 'setup.help', {count: TOWNS_PER_GUILD})}</p>
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

	<div class="guilds" role="group" aria-label={t(hasLists ? 'setup.guilds.lists' : 'setup.guilds')}>
		{#each planner.guildNames as _, g (g)}
			{@const color = guildStyle(g)}
			{@const count = status.counts[g] ?? 0}
			{@const isFull = count === TOWNS_PER_GUILD}
			<div class="guild" class:active={!hasLists && brush === g} style:--guild={color.fill}>
				{#snippet mark()}
					<GuildMark guild={g} size={36}>
						{#if isFull}<Icon name="check" />{:else}{g + 1}{/if}
					</GuildMark>
				{/snippet}
				<!-- No guild to pick when each town has its own list. -->
				{#if hasLists}
					<span class="pick">{@render mark()}</span>
				{:else}
					<button
						class="pick"
						{@attach focusFallback()}
						aria-pressed={brush === g}
						aria-label={t('setup.assign', {guild: planner.displayNames[g]!})}
						onclick={() => (brush = g)}
					>
						{@render mark()}
					</button>
				{/if}
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

	{#if hasLists}
		<ul class="towns" aria-label={t('setup.towns', {map: mapName(map)})}>
			{#each towns as town (town.id)}
				{@const owner = planner.startingTowns[town.id]}
				<li>
					<!-- Named by the town alone: a wrapping label would add the guild chosen. -->
					<label class="town" for="{id}-{town.id}">{kingdomName(town)}</label>
					<span
						class="choice"
						class:owned={owner !== undefined}
						style:--guild={owner === undefined ? undefined : guildStyle(owner).fill}
					>
						<!-- Shows the outline as well as the colour; the list names the guild. -->
						{#if owner !== undefined}<GuildMark guild={owner} size={24} />{/if}
						<select
							id="{id}-{town.id}"
							value={owner ?? ''}
							disabled={lock !== undefined}
							onchange={event => assign(town, event.currentTarget.value)}
						>
							<option value="">{t('kingdom.vacant')}</option>
							{#each planner.displayNames as name, g (g)}
								<option value={g}>{name}</option>
							{/each}
						</select>
					</span>
				</li>
			{/each}
		</ul>
	{:else}
		<MapCanvas
			{map}
			owners={planner.start}
			guildNames={planner.displayNames}
			label={t('setup.map', {map: mapName(map)})}
			isInteractive={kingdom => kingdom.kind === 'town' && lock === undefined}
			onSelect={select}
		/>
	{/if}

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
						{t(hasLists ? 'setup.tooMany.lists' : 'setup.tooMany', {
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

	.towns {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.towns li {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.town {
		flex: none;
		min-width: 4.5em;
		font-weight: 600;
	}

	.choice {
		position: relative;
		flex: 1;
		display: flex;
		align-items: center;
		min-width: 0;
	}

	/* Inside the list's box, where the guild's colour edges it. */
	.choice :global(.mark) {
		position: absolute;
		inset-inline-start: 8px;
		pointer-events: none;
	}

	select {
		flex: 1;
		min-width: 0;
		min-height: 40px;
		padding-inline: 8px;
		border: 2px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		text-overflow: ellipsis;
	}

	.owned select {
		padding-inline-start: 40px;
		border-color: var(--guild);
		font-weight: 600;
	}

	select:disabled {
		opacity: 0.6;
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
