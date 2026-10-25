<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<!--
  Draws a guild's outline along a shape centred on the origin: a solid line on
  the edge and, inside it past a sliver of fill, the guild's pattern, both in
  one colour. Patterns repeat a whole number of times around the shape, so
  there is no seam where the path starts.
-->
<script lang="ts">
	import type {OutlineStyle} from './guilds.ts';
	import type {Shape} from './map-layout.ts';

	interface Props {
		shape: Shape;
		style: OutlineStyle;
		/**
		Size the pattern is scaled to, about the shape's radius.
		*/
		unit: number;
		/**
		Colour of both lines; the theme's outline colour by default.
		*/
		colour?: string;
	}
	let {shape, style, unit, colour}: Props = $props();

	/**
	Widths, relative to `unit`, of the solid edge, the fill showing between
	the two lines, and the pattern.
	*/
	const EDGE = 0.13;
	const GAP = 0.07;
	const THICK = 0.17;

	/**
	The pattern's path, far enough inside the edge to leave the gap.
	*/
	const inner = $derived(shape.inset(((EDGE / 2) + GAP + (THICK / 2)) * unit));

	/**
	Dash pattern in user units. Round line caps add half the line width to
	each end of every dash, so dashes are shortened and gaps widened by the
	width to keep the pattern as designed (and dots as dots).
	*/
	const dashes = $derived.by(() => {
		if (!style.dash) {
			return undefined;
		}

		const width = THICK * unit;
		return style.dash
			.map((n, i) => (i % 2 === 0 ? Math.max(0.001, (n * unit) - width) : (n * unit) + width))
			.join(' ');
	});

	/**
	Path length that makes the pattern fit the shape a whole number of times.
	*/
	const pathLength = $derived.by(() => {
		if (!style.dash) {
			return undefined;
		}

		const pattern = style.dash.reduce((a, b) => a + b, 0) * unit;
		return Math.max(1, Math.round(inner.length / pattern)) * pattern;
	});
</script>

{#if style.name !== 'none'}
	<path d={shape.d} class="line" stroke-width={EDGE * unit} style:stroke={colour} />
	<path
		d={inner.d}
		class="line"
		stroke-width={THICK * unit}
		stroke-dasharray={dashes}
		{pathLength}
		style:stroke={colour}
	/>
{/if}

<style>
	.line {
		fill: none;
		stroke: var(--outline);
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
