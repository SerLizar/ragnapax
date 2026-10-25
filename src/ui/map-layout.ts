// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {GameMap, Kingdom} from '../domain/map.ts';
import type {KingdomKind} from '../domain/types.ts';

/**
Where and how big every marker is drawn. Map files give positions that
follow the game; here they are stretched to fill the drawing, since which
kingdom lies left of or above which matters to players far more than the
distances between them. Pure geometry, so it is tested without a browser.
*/

/**
The drawing is a square canvas of this many units a side.
*/
export const CANVAS = 100;

/**
Marker sizes, in canvas units, at full size.
*/
export const MARKER = {
	/**
	Radius of a town's circle.
	*/
	town: 4.2,
	/**
	Half the height of a dorm's badge.
	*/
	dormitory: 3.9,
	/**
	Size of the castle's keep.
	*/
	castle: 6.2,
} as const satisfies Record<KingdomKind, number>;

/**
Font sizes, in canvas units, at full size.
*/
export const FONT = {town: 4, dormitory: 3.1, castle: 3.1} as const;

/**
How far a capture ring sits outside its marker.
*/
const RING = 2;

/**
Markers are drawn full size on maps up to this many pixels wide, and keep
the same size in pixels on wider maps, so a large map gains room between
kingdoms rather than oversized markers.
*/
const FULL_SIZE_UP_TO = 400;

/**
Smallest gap, in canvas units at full size, between two markers' shapes.
*/
const MIN_GAP = 0.6;

/**
Average width of a bold character, in ems: generous, so labels never spill.
*/
const CHAR_WIDTH = 0.64;

/**
Chinese, Japanese and Korean characters, and full-width forms, are a whole em wide.
*/
const WIDE =
	/[\u{1100}-\u{115F}\u{2E80}-\u{A4CF}\u{AC00}-\u{D7A3}\u{F900}-\u{FAFF}\u{FE30}-\u{FE4F}\u{FF00}-\u{FF60}\u{FFE0}-\u{FFE6}]/u;

/**
Width of a label in canvas units, for a font size in canvas units.
*/
export const textWidth = (text: string, font: number) =>
	[...text].reduce((sum, char) => sum + (WIDE.test(char) ? 1 : CHAR_WIDTH), 0) * font;

/**
The names shown for a kingdom: in full, and short for small markers.
*/
export type MarkerText = {
	readonly name: string;
	readonly label: string;
};

export type Shape = {
	/**
	SVG path, centred on the kingdom's position.
	*/
	readonly d: string;
	/**
	Length of the path, so outline patterns can be fitted to it.
	*/
	readonly length: number;
	/**
	The same shape with its edge moved inwards by `by`, so a second outline
	can be drawn inside the first.
	*/
	readonly inset: (by: number) => Shape;
};

/**
Everything about one marker, before scaling, centred on its position.
*/
export type Marker = {
	readonly shape: Shape;
	/**
	Drawn around the marker when it changes hands.
	*/
	readonly ring: Shape;
	/**
	Text inside the marker.
	*/
	readonly label: string;
	/**
	Vertical centre of the label, which sits below the castle's battlements.
	*/
	readonly labelY: number;
	/**
	Rectangles, relative to the position, that must not touch another marker's.
	*/
	readonly boxes: readonly Box[];
	/**
	Furthest extent of the marker and its ring, for fitting the canvas.
	*/
	readonly bounds: Box;
};

export type Box = {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
};

export type MapLayout = {
	/**
	Marker scale: 1 on small maps, less on wide ones.
	*/
	readonly scale: number;
	/**
	Whether dorms show their full names.
	*/
	readonly fullNames: boolean;
	/**
	Drawn position of every kingdom, by index.
	*/
	readonly points: ReadonlyArray<{readonly x: number; readonly y: number}>;
	/**
	Marker of every kingdom, by index, before scaling.
	*/
	readonly markers: readonly Marker[];
};

type Point = readonly [number, number];

/**
Moves every edge of a polygon inwards by `by` and joins them where they
meet, as a mitred line would. Only for insets smaller than the polygon's
narrowest part, which holds for the outlines drawn here.
*/
function insetPoints(points: readonly Point[], by: number): Point[] {
	const n = points.length;
	let area = 0;
	for (const [i, [x, y]] of points.entries()) {
		const [nx, ny] = points[(i + 1) % n]!;
		area += (x * ny) - (nx * y);
	}

	// Inwards is to the left of each edge when the shoelace area is positive.
	const side = area > 0 ? 1 : -1;
	const normal = ([x, y]: Point, [nx, ny]: Point): Point => {
		const length = Math.hypot(nx - x, ny - y);
		return [(-(ny - y) / length) * side, ((nx - x) / length) * side];
	};

	return points.map((point, i) => {
		const previous = points[(i + n - 1) % n]!;
		const next = points[(i + 1) % n]!;
		const [ax, ay] = normal(previous, point);
		const [bx, bY] = normal(point, next);
		// The corner moves along the bisector of the two normals, far enough
		// that both edges end up `by` away.
		const [mx, my] = [ax + bx, ay + bY];
		const scale = by / (1 + (ax * bx) + (ay * bY));
		return [point[0] + (mx * scale), point[1] + (my * scale)];
	});
}

const polygon = (points: readonly Point[]): Shape => {
	let length = 0;
	for (const [i, [x, y]] of points.entries()) {
		const [nx, ny] = points[(i + 1) % points.length]!;
		length += Math.hypot(nx - x, ny - y);
	}

	return {
		d: 'M ' + points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L ') + ' Z',
		length,
		inset: by => polygon(insetPoints(points, by)),
	};
};

export const circle = (r: number): Shape => ({
	d: `M ${-r} 0 a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`,
	length: 2 * Math.PI * r,
	inset: by => circle(r - by),
});

/**
A hexagon stretched sideways to hold a label.
*/
function badge(halfWidth: number, halfHeight: number): Shape {
	const tip = halfHeight * 0.6;
	return polygon([
		[-halfWidth, 0],
		[-halfWidth + tip, -halfHeight],
		[halfWidth - tip, -halfHeight],
		[halfWidth, 0],
		[halfWidth - tip, halfHeight],
		[-halfWidth + tip, halfHeight],
	]);
}

/**
A keep with three battlements, from `-top` to `bottom` around the centre.
*/
function keep(halfWidth: number, top: number, bottom: number, notch: number): Shape {
	const step = (2 * halfWidth) / 5;
	const at = (i: number) => -halfWidth + (i * step);
	return polygon([
		[-halfWidth, bottom],
		[-halfWidth, -top],
		[at(1), -top],
		[at(1), -top + notch],
		[at(2), -top + notch],
		[at(2), -top],
		[at(3), -top],
		[at(3), -top + notch],
		[at(4), -top + notch],
		[at(4), -top],
		[halfWidth, -top],
		[halfWidth, bottom],
	]);
}

/**
A rectangle with rounded corners, from `-top` to `bottom` around the centre.
*/
function roundedBox(halfWidth: number, top: number, bottom: number, radius: number): Shape {
	const [w, h] = [2 * (halfWidth - radius), top + bottom - (2 * radius)];
	const corner = `a ${radius} ${radius} 0 0 1`;
	return {
		d:
			`M ${-halfWidth + radius} ${-top} h ${w} ${corner} ${radius} ${radius} v ${h} `
			+ `${corner} ${-radius} ${radius} h ${-w} ${corner} ${-radius} ${-radius} v ${-h} `
			+ `${corner} ${radius} ${-radius} Z`,
		length: (2 * (w + h)) + (2 * Math.PI * radius),
		inset: by => roundedBox(halfWidth - by, top - by, bottom - by, Math.max(0.01, radius - by)),
	};
}

const box = (left: number, top: number, right: number, bottom: number): Box => ({
	left,
	top,
	right,
	bottom,
});

function grow(b: Box, by: number): Box {
	return box(b.left - by, b.top - by, b.right + by, b.bottom + by);
}

/**
The marker for a kingdom, with its full or short name. `text` holds the
names in the player's language; the map data's English ones by default.
*/
export function markerOf(t: Kingdom, hasFullNames: boolean, text: MarkerText = t): Marker {
	const r = MARKER[t.kind];
	if (t.kind === 'town') {
		const boxes = [box(-r, -r, r, r)];
		return {
			shape: circle(r),
			ring: circle(r + RING),
			label: text.label,
			labelY: 0,
			boxes,
			bounds: grow(boxes[0]!, RING),
		};
	}

	if (t.kind === 'dormitory') {
		const label = hasFullNames ? text.name : text.label;
		const tip = r * 0.6;
		const halfWidth = Math.max(r * 1.45, (textWidth(label, FONT.dormitory) / 2) + tip + 0.5);
		const boxes = [box(-halfWidth, -r, halfWidth, r)];
		return {
			shape: badge(halfWidth, r),
			ring: badge(halfWidth + RING, r + RING),
			label,
			labelY: 0,
			boxes,
			bounds: grow(boxes[0]!, RING),
		};
	}

	// Always the short name: "Darkwick Castle" would need a keep stretched out of shape.
	const [halfWidth, top, bottom, notch] = [r * 1.05, r * 0.95, r * 0.8, r * 0.38];
	const boxes = [box(-halfWidth, -top, halfWidth, bottom)];
	return {
		shape: keep(halfWidth, top, bottom, notch),
		ring: roundedBox(halfWidth + RING, top + RING, bottom + RING, RING * 1.5),
		label: text.label,
		labelY: (notch - top + bottom) / 2,
		boxes,
		bounds: grow(boxes[0]!, RING),
	};
}

/**
Stretches positions along one axis to fill `[0, CANVAS]` as far as the
markers' extents allow: the largest stretch that keeps every marker inside,
centred in whatever room is left.
*/
function fitAxis(
	values: readonly number[],
	before: readonly number[],
	after: readonly number[],
): number[] {
	let stretch = Infinity;
	for (const [i, vi] of values.entries()) {
		for (const [j, vj] of values.entries()) {
			if (vi > vj) {
				stretch = Math.min(stretch, (CANVAS - after[i]! - before[j]!) / (vi - vj));
			}
		}
	}

	if (!Number.isFinite(stretch)) {
		stretch = 0;
	}

	const low = Math.max(...values.map((v, i) => before[i]! - (stretch * v)));
	const high = Math.min(...values.map((v, i) => CANVAS - after[i]! - (stretch * v)));
	const offset = (low + high) / 2;
	return values.map(v => offset + (stretch * v));
}

function place(
	map: GameMap,
	scale: number,
	hasFullNames: boolean,
	texts: readonly MarkerText[],
): MapLayout {
	const markers = map.kingdoms.map(t => markerOf(t, hasFullNames, texts[t.index]));
	const side = (pick: (b: Box) => number) => markers.map(m => pick(m.bounds) * scale);
	const xs = fitAxis(
		map.kingdoms.map(t => t.x),
		side(b => -b.left),
		side(b => b.right),
	);
	const ys = fitAxis(
		map.kingdoms.map(t => t.y),
		side(b => -b.top),
		side(b => b.bottom),
	);
	return {
		scale, fullNames: hasFullNames, markers, points: xs.map((x, i) => ({x, y: ys[i]!})),
	};
}

/**
Boxes of a marker on the canvas.
*/
function placedBoxes(layout: MapLayout, index: number): Box[] {
	const {x, y} = layout.points[index]!;
	const s = layout.scale;
	return layout.markers[index]!.boxes.map(b =>
		box(x + (b.left * s), y + (b.top * s), x + (b.right * s), y + (b.bottom * s)),
	);
}

/**
Distance between two boxes; 0 when they touch or overlap.
*/
function gap(a: Box, b: Box): number {
	const dx = Math.max(0, a.left - b.right, b.left - a.right);
	const dy = Math.max(0, a.top - b.bottom, b.top - a.bottom);
	return Math.hypot(dx, dy);
}

/**
Distance between town markers and other boxes: towns are circles, so their
corners must not count as a collision.
*/
function markerGap(layout: MapLayout, map: GameMap, i: number, j: number): number {
	const [ti, tj] = [map.kingdoms[i]!, map.kingdoms[j]!];
	const [pi, pj] = [layout.points[i]!, layout.points[j]!];
	const s = layout.scale;
	if (ti.kind === 'town' && tj.kind === 'town') {
		return Math.hypot(pi.x - pj.x, pi.y - pj.y) - (2 * MARKER.town * s);
	}

	if (ti.kind === 'town' || tj.kind === 'town') {
		const [town, other] = ti.kind === 'town' ? [i, j] : [j, i];
		const p = layout.points[town]!;
		const point = box(p.x, p.y, p.x, p.y);
		return Math.min(...placedBoxes(layout, other).map(b => gap(point, b))) - (MARKER.town * s);
	}

	let nearest = Infinity;
	for (const a of placedBoxes(layout, i)) {
		for (const b of placedBoxes(layout, j)) {
			nearest = Math.min(nearest, gap(a, b));
		}
	}

	return nearest;
}

/**
Pairs of kingdoms, by id, whose markers touch or overlap.
*/
export function overlaps(map: GameMap, layout: MapLayout): Array<[string, string]> {
	const found: Array<[string, string]> = [];
	const n = map.kingdoms.length;
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			if (markerGap(layout, map, i, j) < MIN_GAP * layout.scale) {
				found.push([map.kingdoms[i]!.id, map.kingdoms[j]!.id]);
			}
		}
	}

	return found;
}

/**
Roads, by end ids, that pass under the marker of a kingdom they do not
connect, where they would look like they lead to it. Clipping the edge of a
marker is fine.
*/
export function roadsThroughMarkers(map: GameMap, layout: MapLayout): string[] {
	const found: string[] = [];
	const inside = (t: Kingdom, x: number, y: number) => {
		const p = layout.points[t.index]!;
		const s = layout.scale * 0.8;
		if (t.kind === 'town') {
			return Math.hypot(x - p.x, y - p.y) < MARKER.town * s;
		}

		const b = layout.markers[t.index]!.boxes[0]!;
		return (
			x > p.x + (b.left * s) && x < p.x + (b.right * s) && y > p.y + (b.top * s) && y < p.y + (b.bottom * s)
		);
	};

	for (const [a, b] of map.roads) {
		const [pa, pb] = [layout.points[a]!, layout.points[b]!];
		for (const t of map.kingdoms) {
			if (t.index === a || t.index === b) {
				continue;
			}

			for (let k = 0; k <= 64; k++) {
				const x = pa.x + (((pb.x - pa.x) * k) / 64);
				const y = pa.y + (((pb.y - pa.y) * k) / 64);
				if (inside(t, x, y)) {
					found.push(`${map.kingdoms[a]!.id}–${map.kingdoms[b]!.id} under ${t.id}`);
					break;
				}
			}
		}
	}

	return found;
}

/**
Lays out a map drawn `pixels` wide: markers at a steady size, positions
filling the canvas, and full names wherever they fit without overlapping.
`texts` are the kingdoms' names by index, in the player's language.
*/
export function layoutMap(
	map: GameMap,
	pixels: number,
	texts: readonly MarkerText[] = map.kingdoms,
): MapLayout {
	const scale = pixels > FULL_SIZE_UP_TO ? FULL_SIZE_UP_TO / pixels : 1;
	const full = place(map, scale, true, texts);
	return overlaps(map, full).length === 0 ? full : place(map, scale, false, texts);
}

export type Direction = 'up' | 'down' | 'left' | 'right';

const UNIT: Record<Direction, readonly [number, number]> = {
	up: [0, -1],
	down: [0, 1],
	left: [-1, 0],
	right: [1, 0],
};

/**
The kingdom among `candidates` that an arrow key leads to from `from`:
the nearest in that direction, counting distance off the arrow's line twice,
so the arrow goes where it points rather than to a close neighbour off to
the side. Undefined when nothing lies that way.
*/
export function nearestInDirection(
	points: MapLayout['points'],
	from: number,
	direction: Direction,
	candidates: readonly number[],
): number | undefined {
	const [dx, dy] = UNIT[direction];
	const start = points[from]!;
	let best: number | undefined;
	let bestScore = Infinity;
	for (const i of candidates) {
		const x = points[i]!.x - start.x;
		const y = points[i]!.y - start.y;
		const along = (x * dx) + (y * dy);
		const across = Math.abs((x * dy) - (y * dx));
		const score = along + (2 * across);
		// Only within 45° of the arrow: a diagonal neighbour belongs to the
		// other arrow.
		if (i === from || along <= across || score >= bestScore) {
			continue;
		}

		best = i;
		bestScore = score;
	}

	return best;
}
