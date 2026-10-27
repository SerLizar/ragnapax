<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<!--
  One guild's declares on one day, as kingdom chips naming any guild a
  kingdom was taken from, or a note that it has none.
-->
<script lang="ts">
	import type {GameMap} from '../domain/map.ts';
	import type {Capture} from '../domain/plan.ts';
	import {VACANT} from '../domain/types.ts';
	import {kingdomName} from '../i18n/describe.ts';
	import {
		aroundSlot,
		SLOT,
		t,
	} from '../i18n/i18n.svelte.ts';
	import GuildMark from './GuildMark.svelte';

	interface Props {
		map: GameMap;
		captures: readonly Capture[];
		guildNames: readonly string[];
	}
	let {map, captures, guildNames}: Props = $props();

	/**
	Text either side of the rival guild in "from {guild}", in any word order.
	*/
	const from = $derived(aroundSlot(t('days.from', {guild: SLOT})));
</script>

{#if captures.length}
	<ul class="targets">
		{#each captures as c (c.kingdom)}
			{@const kingdom = map.kingdoms[c.kingdom]!}
			<li>
				<span class="target {kingdom.kind}">{kingdomName(kingdom)}</span>
				{#if c.from !== VACANT}
					<span class="from">
						{from[0]}<GuildMark guild={c.from} size={12} />{guildNames[c.from]}{from[1]}
					</span>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<p class="none">{t('days.none')}</p>
{/if}

<style>
	.targets {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 8px 0 0;
		padding: 0;
		list-style: none;
	}

	.targets li {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		border-radius: 999px;
		background: var(--surface);
		border: 1px solid var(--border);
		font-size: 0.9rem;
	}

	.target {
		font-weight: 700;
	}

	/* Decoration only: the alternative text after the slash keeps screen
	readers from announcing a chess rook. Browsers without it skip the second. */
	.target.castle::before {
		content: '♜ ';
		content: '♜ ' / '';
	}

	.from {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--muted);
		font-size: 0.8rem;
	}

	.none {
		margin-block: 4px 0;
		margin-inline: 24px 0;
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
