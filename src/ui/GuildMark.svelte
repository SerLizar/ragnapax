<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<!--
  A guild's colour and outline as a small round swatch, matching its map
  markers, so players learn each guild's outline wherever the guild appears.
-->
<script lang="ts">
	import type {Snippet} from 'svelte';
	import type {GuildIndex} from '../domain/types.ts';
	import {guildStyle} from './guilds.ts';
	import {circle} from './map-layout.ts';
	import Outline from './Outline.svelte';

	interface Props {
		guild: GuildIndex;
		/**
		Diameter in pixels.
		*/
		size?: number;
		/**
		Drawn on top, in the guild's ink colour.
		*/
		children?: Snippet;
	}
	let {guild, size = 14, children}: Props = $props();

	const style = $derived(guildStyle(guild));
	const R = 7.4;
	const shape = circle(R);
</script>

<span class="mark" style:width="{size}px" style:height="{size}px" style:color={style.ink}>
	<svg viewBox="-12 -12 24 24" aria-hidden="true">
		<circle r={R} fill={style.fill} />
		<Outline {shape} style={style.outline} unit={R} colour={style.line} />
	</svg>
	{#if children}<span class="content">{@render children()}</span>{/if}
</span>

<style>
	.mark {
		position: relative;
		display: inline-grid;
		place-items: center;
		flex: none;
	}

	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.content {
		position: relative;
		display: grid;
		place-items: center;
		font-weight: 700;
	}
</style>
