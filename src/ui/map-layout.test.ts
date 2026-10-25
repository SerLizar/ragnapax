// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
} from 'vitest';
import {kingdomLabel, kingdomTexts} from '../i18n/describe.ts';
import {setLocale} from '../i18n/i18n.svelte.ts';
import {LOCALES} from '../i18n/locales.ts';
import {MAPS} from '../maps/index.ts';
import {
	CANVAS,
	FONT,
	layoutMap,
	markerOf,
	nearestInDirection,
	overlaps,
	roadsThroughMarkers,
	textWidth,
} from './map-layout.ts';

/**
Rendered map widths, in pixels, from a 300 px phone to a wide desktop column.
*/
const WIDTHS = [230, 260, 300, 350, 400, 450, 534, 700, 900];

describe.each(MAPS)('drawing $name', map => {
	it.each(WIDTHS)('keeps markers apart at %i px', width => {
		expect(overlaps(map, layoutMap(map, width))).toEqual([]);
	});

	it.each(WIDTHS)('keeps roads clear of other kingdoms at %i px', width => {
		expect(roadsThroughMarkers(map, layoutMap(map, width))).toEqual([]);
	});

	it('fills the canvas and keeps every marker inside it', () => {
		for (const width of WIDTHS) {
			const layout = layoutMap(map, width);
			const edges = layout.points.map((p, i) => {
				const b = layout.markers[i]!.bounds;
				const s = layout.scale;
				return [p.x + (b.left * s), p.y + (b.top * s), p.x + (b.right * s), p.y + (b.bottom * s)];
			});
			expect(Math.min(...edges.map(edge => edge[0]!))).toBeCloseTo(0);
			expect(Math.min(...edges.map(edge => edge[1]!))).toBeCloseTo(0);
			expect(Math.max(...edges.map(edge => edge[2]!))).toBeCloseTo(CANVAS);
			expect(Math.max(...edges.map(edge => edge[3]!))).toBeCloseTo(CANVAS);
		}
	});

	it('keeps every kingdom on the same side of every other as in the game', () => {
		const layout = layoutMap(map, 400);
		for (const a of map.kingdoms) {
			for (const b of map.kingdoms) {
				const [pa, pb] = [layout.points[a.index]!, layout.points[b.index]!];
				expect(Math.sign(pa.x - pb.x)).toBe(Math.sign(a.x - b.x));
				expect(Math.sign(pa.y - pb.y)).toBe(Math.sign(a.y - b.y));
			}
		}
	});
});

it('keeps markers the same size in pixels on wide maps', () => {
	const map = MAPS[0]!;
	expect(layoutMap(map, 300).scale).toBe(1);
	expect(layoutMap(map, 800).scale * 800).toBeCloseTo(layoutMap(map, 400).scale * 400);
});

it('shows full names once there is room for them', () => {
	const map = MAPS[0]!;
	const dorm = map.kingdoms.find(t => t.kind === 'dormitory')!;
	const wide = layoutMap(map, 900);
	expect(wide.fullNames).toBe(true);
	expect(wide.markers[dorm.index]!.label).toBe(dorm.name);
});

it('keeps the castle\'s name inside its keep', () => {
	for (const map of MAPS) {
		const castle = map.kingdoms.find(t => t.kind === 'castle')!;
		for (const hasFullNames of [false, true]) {
			const marker = markerOf(castle, hasFullNames);
			const [keep] = marker.boxes;
			expect(marker.label).toBe(castle.label);
			expect(marker.boxes).toHaveLength(1);
			// Below the middle of the keep, clear of the battlements, and above its base.
			expect(marker.labelY).toBeGreaterThan(0);
			expect(marker.labelY - (FONT.castle / 2)).toBeGreaterThan(keep!.top);
			expect(marker.labelY + (FONT.castle / 2)).toBeLessThan(keep!.bottom);
		}
	}
});

it('insets every marker\'s edge by the same distance all round', () => {
	const by = 0.9;
	type Point = readonly [number, number];
	const points = (d: string): Point[] =>
		Array.from(d.matchAll(/(?<x>-?[\d.]+) (?<y>-?[\d.]+)/gu), ({groups}) => [Number(groups!.x), Number(groups!.y)]);
	// Distance from a point to the line through an edge.
	const away = ([x, y]: Point, [ax, ay]: Point, [bx, bY]: Point) =>
		Math.abs(((bx - ax) * (ay - y)) - ((ax - x) * (bY - ay))) / Math.hypot(bx - ax, bY - ay);
	// Dorms and the castle are polygons; a town's circle is checked below.
	for (const map of MAPS) {
		for (const kingdom of map.kingdoms) {
			if (kingdom.kind === 'town') {
				continue;
			}

			const {shape} = markerOf(kingdom, true);
			const outer = points(shape.d);
			const inner = points(shape.inset(by).d);
			expect(inner).toHaveLength(outer.length);
			for (const [i, point] of inner.entries()) {
				const n = outer.length;
				expect(away(point, outer[(i + n - 1) % n]!, outer[i]!)).toBeCloseTo(by, 1);
				expect(away(point, outer[i]!, outer[(i + 1) % n]!)).toBeCloseTo(by, 1);
			}

			expect(shape.inset(by).length).toBeLessThan(shape.length);
		}
	}

	const town = markerOf(MAPS[0]!.kingdoms.find(t => t.kind === 'town')!, true).shape;
	expect(town.length - town.inset(by).length).toBeCloseTo(2 * Math.PI * by);
});

// Translated names change label widths, so every language is drawn too.
describe.each(LOCALES)('drawing in $english', ({code}) => {
	beforeAll(async () => setLocale(code));
	afterAll(async () => setLocale('en'));

	it.each(MAPS)('keeps markers and roads apart on $name', map => {
		const texts = kingdomTexts(map);
		for (const width of WIDTHS) {
			const layout = layoutMap(map, width, texts);
			expect(overlaps(map, layout), `${width} px`).toEqual([]);
			expect(roadsThroughMarkers(map, layout), `${width} px`).toEqual([]);
		}
	});

	it('fits the castle\'s short name inside its keep', () => {
		const castle = MAPS[0]!.kingdoms.find(t => t.kind === 'castle')!;
		const [keep] = markerOf(castle, false).boxes;
		expect(textWidth(kingdomLabel(castle), FONT.castle)).toBeLessThan(keep!.right - keep!.left);
	});
});

describe('moving between kingdoms with arrow keys', () => {
	const map = MAPS.find(m => m.id === 'floating-city')!;
	const {points} = layoutMap(map, 400);
	const all = map.kingdoms.map(t => t.index);
	const at = (id: string) => map.indexOf(id)!;
	const move = (id: string, direction: 'up' | 'down' | 'left' | 'right', candidates = all) => {
		const next = nearestInDirection(points, at(id), direction, candidates);
		return next === undefined ? undefined : map.kingdoms[next]!.id;
	};

	it('goes to the nearest kingdom the arrow points at', () => {
		expect(move('A', 'right')).toBe('B');
		expect(move('A', 'down')).toBe('F');
		expect(move('F', 'left')).toBe('E');
		expect(move('F', 'up')).toBe('A');
	});

	it('stays put when nothing lies that way', () => {
		expect(move('A', 'up')).toBeUndefined();
		expect(move('E', 'left')).toBeUndefined();
	});

	it('only lands on kingdoms that can be picked', () => {
		const towns = map.kingdoms.filter(t => t.kind === 'town').map(t => t.index);
		expect(move('Q', 'up', towns)).toBe('O');
	});

	// Setting up, only towns can be picked; recording a day, any kingdom.
	it.each(MAPS)('reaches every kingdom of $name from any other', other => {
		const layout = layoutMap(other, 400);
		const sets = [
			other.kingdoms.map(t => t.index),
			other.kingdoms.filter(t => t.kind === 'town').map(t => t.index),
		];
		// Every kingdom reached by arrow keys alone, from `start`.
		const reached = (start: number, indices: readonly number[]) => {
			const seen = new Set([start]);
			const queue = [start];
			while (queue.length > 0) {
				const from = queue.shift()!;
				for (const direction of ['up', 'down', 'left', 'right'] as const) {
					const next = nearestInDirection(layout.points, from, direction, indices);
					if (next === undefined || seen.has(next)) {
						continue;
					}

					seen.add(next);
					queue.push(next);
				}
			}

			return seen;
		};

		for (const indices of sets) {
			for (const start of indices) {
				expect(reached(start, indices).size).toBe(indices.length);
			}
		}
	});
});
