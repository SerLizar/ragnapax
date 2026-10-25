<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<script lang="ts">
	import type {GameMap, Kingdom} from '../domain/map.ts';
	import type {Ownership} from '../domain/plan.ts';
	import {VACANT, type GuildIndex, type KingdomIndex} from '../domain/types.ts';
	import {kingdomName, kingdomTexts} from '../i18n/describe.ts';
	import {t} from '../i18n/i18n.svelte.ts';
	import {FADED_FILL_OPACITY, guildStyle} from './guilds.ts';
	import {
		CANVAS,
		FONT,
		MARKER,
		layoutMap,
		nearestInDirection,
		type Direction,
	} from './map-layout.ts';
	import Outline from './Outline.svelte';

	interface Props {
		map: GameMap;
		owners: Ownership;
		guildNames: readonly string[];
		/**
		Kingdoms that changed hands, drawn with a ring.
		*/
		changed?: ReadonlySet<KingdomIndex>;
		/**
		Fade kingdoms this guild does not hold.
		*/
		focus?: GuildIndex;
		/**
		Kingdoms that react to taps; the rest are context.
		*/
		isInteractive?: (t: Kingdom) => boolean;
		onSelect?: (t: Kingdom) => void;
		label: string;
	}

	let {
		map,
		owners,
		guildNames,
		changed = new Set(),
		focus,
		isInteractive = () => false,
		onSelect,
		label,
	}: Props = $props();

	/**
	Rendered width in pixels: markers keep their size and names show when they fit.
	*/
	let width = $state(0);
	const layout = $derived(layoutMap(map, width, kingdomTexts(map)));

	const ownerName = (g: GuildIndex) => (g === VACANT ? t('kingdom.vacant') : guildNames[g]!);

	function describe(kingdom: Kingdom): string {
		const full = kingdomName(kingdom);
		const shown = layout.markers[kingdom.index]!.label;
		const parameters = {
			// A town shows its letter, which its name holds already.
			kingdom: full.split(' ').includes(shown) ? full : t('label.shortened', {short: shown, full}),
			owner: ownerName(owners[kingdom.index]!),
		};
		return t(changed.has(kingdom.index) ? 'marker.captured' : 'marker.owner', parameters);
	}

	const id = $props.id();
	let svg: SVGSVGElement | undefined;

	/**
	The map is one stop on the Tab key, at the last kingdom focused (or the
	first that can be picked), and arrow keys move between kingdoms by where
	they are drawn. The map files' order, which screen readers read in, stays
	as it is: it shapes solve times.
	*/
	const selectable = $derived(map.kingdoms
		.filter(kingdom => isInteractive(kingdom))
		.map(kingdom => kingdom.index));
	let current = $state<KingdomIndex | undefined>();
	const tabStop = $derived(
		current !== undefined && selectable.includes(current) ? current : selectable[0],
	);

	const ARROWS: Record<string, Direction> = {
		ArrowUp: 'up',
		ArrowDown: 'down',
		ArrowLeft: 'left',
		ArrowRight: 'right',
	};

	/**
	Where a key moves focus from `kingdom`: null if the key does not move
	it, undefined if nothing lies that way.
	*/
	function destination(key: string, kingdom: Kingdom): KingdomIndex | undefined | null {
		const direction = ARROWS[key];
		if (direction !== undefined) {
			return nearestInDirection(layout.points, kingdom.index, direction, selectable);
		}

		if (key === 'Home' || key === 'End') {
			return key === 'Home' ? selectable[0] : selectable.at(-1);
		}

		return null;
	}

	function remember(event: FocusEvent) {
		const {index} = (event.target as SVGElement).dataset;
		if (index !== undefined) {
			current = Number(index);
		}
	}

	function keydown(event: KeyboardEvent, kingdom: Kingdom) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			// A held key would hand the kingdom over and back again and again.
			if (!event.repeat) {
				onSelect?.(kingdom);
			}

			return;
		}

		const next = destination(event.key, kingdom);
		if (next === null) {
			return;
		}

		event.preventDefault();
		if (next === undefined) {
			return;
		}

		current = next;
		svg?.querySelector<SVGElement>(`[data-index="${CSS.escape(String(next))}"]`)?.focus();
	}
</script>

<!-- Listened for here: Chromium makes any SVG element with a focus listener
focusable, which would put every kingdom on the Tab key. -->
<div class="frame" bind:clientWidth={width} onfocusin={remember}>
	{#if selectable.length > 0}
		<p class="visually-hidden" id="{id}-keys">{t('map.keys')}</p>
	{/if}
	<svg
		bind:this={svg}
		class="map"
		viewBox="0 0 {CANVAS} {CANVAS}"
		role="group"
		aria-label={label}
		aria-describedby={selectable.length > 0 ? `${id}-keys` : undefined}
	>
		<g class="roads">
			{#each map.roads as [a, b] (`${a}-${b}`)}
				{@const pa = layout.points[a]!}
				{@const pb = layout.points[b]!}
				{@const owner = owners[a]!}
				<!-- Focusing on a guild colours only its own roads. -->
				{@const isShared = owner !== VACANT && owner === owners[b] && (focus === undefined || owner === focus)}
				<!-- Shared roads are cased in the road colour: a pale guild colour alone
				could not be seen against the map. -->
				<line
					x1={pa.x}
					y1={pa.y}
					x2={pb.x}
					y2={pb.y}
					stroke-width={(isShared ? 2 : 0.9) * layout.scale}
				/>
				{#if isShared}
					<line
						x1={pa.x}
						y1={pa.y}
						x2={pb.x}
						y2={pb.y}
						class="shared"
						stroke-width={1.4 * layout.scale}
						style:stroke={guildStyle(owner).fill}
					/>
				{/if}
			{/each}
		</g>

		{#each map.kingdoms as kingdom (kingdom.id)}
			{@const owner = owners[kingdom.index]!}
			{@const style = guildStyle(owner)}
			{@const marker = layout.markers[kingdom.index]!}
			{@const point = layout.points[kingdom.index]!}
			{@const canSelect = isInteractive(kingdom)}
			{@const isFaded = (focus !== undefined && owner !== focus) || (!canSelect && onSelect !== undefined)}
			<!-- Only interactive kingdoms (role="button") take focus. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<g
				class="kingdom {kingdom.kind}"
				class:vacant={owner === VACANT}
				class:interactive={canSelect}
				transform="translate({point.x} {point.y}) scale({layout.scale})"
				role={canSelect ? 'button' : 'img'}
				tabindex={canSelect ? (kingdom.index === tabStop ? 0 : -1) : undefined}
				data-index={kingdom.index}
				aria-label={describe(kingdom)}
				onclick={canSelect ? () => onSelect?.(kingdom) : undefined}
				onkeydown={canSelect ? event => keydown(event, kingdom) : undefined}
			>
				{#if changed.has(kingdom.index)}
					<path class="ring" d={marker.ring.d} style:stroke={style.fill} />
				{/if}
				{#if canSelect}
					<circle class="hit" r={MARKER[kingdom.kind] + 2.5} />
				{/if}
				<!-- Faded markers stay opaque, so roads do not show through them. -->
				{#if isFaded}
					<path class="underlay" d={marker.shape.d} />
				{/if}
				<path
					class="shape"
					d={marker.shape.d}
					style:fill={style.fill}
					fill-opacity={isFaded ? FADED_FILL_OPACITY : undefined}
				/>
				<!-- On a faded fill, outlines take the theme's outline colour, as labels
				take the text colour. -->
				<Outline
					shape={marker.shape}
					style={style.outline}
					unit={MARKER.town}
					colour={isFaded ? undefined : style.line}
				/>
				<text
					class="label"
					y={marker.labelY}
					dy="0.36em"
					font-size={FONT[kingdom.kind]}
					style:fill={isFaded ? 'var(--text)' : style.ink}
				>
					{marker.label}
				</text>
			</g>
		{/each}
	</svg>
</div>

<style>
	.frame {
		display: block;
	}

	.map {
		display: block;
		width: 100%;
		height: auto;
		border-radius: var(--radius-sm);
		/* A dot every 5 of the drawing's 100 units, 0.35 in radius. A background,
		not an SVG pattern, whose id would repeat with several maps on the page. */
		background:
			radial-gradient(circle closest-side, var(--map-grid) 14%, transparent 16%) 0 0 / 5% 5%,
			var(--map-bg);
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
	}

	line {
		stroke: var(--road);
		stroke-linecap: round;
		transition:
			stroke 0.25s,
			opacity 0.25s;
	}

	line.shared {
		opacity: 0.55;
	}

	.shape {
		transition:
			fill 0.25s,
			fill-opacity 0.25s;
	}

	.underlay {
		fill: var(--map-bg);
	}

	/* Vacant markers get a plain edge; guilds' patterned outlines come from Outline. */
	.vacant .shape {
		stroke: var(--vacant-stroke);
		stroke-width: 0.6;
		stroke-linejoin: round;
	}

	.label {
		font-weight: 700;
		text-anchor: middle;
		pointer-events: none;
	}

	.ring {
		fill: none;
		stroke-width: 1.1;
		/* A few pulses draw the eye, then it holds still: moving content must
		stop within 5 seconds (WCAG 2.2.2). */
		animation: pulse 1.6s ease-in-out 3;
		transform-origin: center;
		transform-box: fill-box;
	}

	@keyframes pulse {
		50% {
			opacity: 0.35;
			transform: scale(1.12);
		}
	}

	.hit {
		fill: transparent;
	}

	.interactive {
		cursor: pointer;
		outline: none;
	}

	.interactive:hover .shape {
		opacity: 0.85;
	}

	.interactive:focus-visible .hit {
		stroke: var(--accent);
		stroke-width: 0.9;
	}
</style>
