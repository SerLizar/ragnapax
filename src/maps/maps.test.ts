// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {compileMap, findMapProblems, type GameMap} from '../domain/map.ts';
import type {MapDefinition} from '../domain/types.ts';
import {startOfWeek} from '../domain/calendar.ts';
import {castle, town} from './kingdoms.ts';
import {
	ANCHOR_MAP_ID,
	ANCHOR_WEEK,
	findMap,
	MAP_DEFINITIONS,
	MAPS,
	mapOfWeek,
	ROTATION,
} from './index.ts';

describe.each(MAP_DEFINITIONS)('map $name', def => {
	it('is well formed', () => {
		expect(findMapProblems(def)).toEqual([]);
	});

	it('is connected', () => {
		const map = compileMap(def);
		const seen = new Set([0]);
		const queue = [0];
		while (queue.length > 0) {
			for (const n of map.kingdoms[queue.shift()!]!.neighbors) {
				if (seen.has(n)) {
					continue;
				}

				seen.add(n);
				queue.push(n);
			}
		}

		expect(seen.size).toBe(map.kingdoms.length);
	});

	it('uses kingdom ids that are safe in links', () => {
		for (const t of def.kingdoms) {
			expect(t.id).toMatch(/^[\d\-a-z]+$/iu);
		}
	});
});

it('has unique map ids', () => {
	expect(new Set(MAPS.map(m => m.id)).size).toBe(MAPS.length);
});

const linkIds = (m: GameMap) => m.linkOrder.map(t => m.kingdoms[t]!.id);

// Share links name maps by id and kingdoms by their place in link order.
// These are the maps as the game has them: a change here breaks every link and
// saved setup, and should only follow a change in the game itself.
it('keeps the map ids and kingdom order that share links rely on', () => {
	// The game skips the letter I.
	const towns = (last: string) => [
		...'ABCDEFGHJKLMNOPQR'.slice(0, 'ABCDEFGHJKLMNOPQR'.indexOf(last) + 1),
	];
	expect(Object.fromEntries(MAPS.map(m => [m.id, linkIds(m)]))).toEqual({
		'floating-city': [
			...towns('R'),
			'Dionysia',
			'Frostheim',
			'Hotarubi',
			'Jabberwock',
			'Mortkranken',
			'Obscuary',
			'Vagastrom',
			'Darkwick',
		],
		'galaxy-terminal': [
			...towns('R'),
			'Dionysia',
			'Frostheim',
			'Hotarubi',
			'Obscuary',
			'Sinostra',
			'Vagastrom',
			'Darkwick',
		],
		'sea-of-poseidon': [
			...towns('Q'),
			'Dionysia',
			'Hotarubi',
			'Jabberwock',
			'Obscuary',
			'Sinostra',
			'Vagastrom',
			'Darkwick',
		],
	});
});

it('puts kingdoms in the same link order whatever order a map file lists them in', () => {
	for (const def of MAP_DEFINITIONS) {
		const reversed = compileMap({...def, kingdoms: def.kingdoms.toReversed()});
		expect(linkIds(reversed)).toEqual(linkIds(compileMap(def)));
	}
});

describe('findMapProblems', () => {
	const base: MapDefinition = MAP_DEFINITIONS[0]!;

	it('reports unknown road ends and duplicate roads', () => {
		const problems = findMapProblems({
			...base,
			roads: [...base.roads, ['A', 'Nowhere'], ['B', 'A']],
		});
		expect(problems).toContain('Road A–Nowhere references unknown "Nowhere".');
		expect(problems).toContain('Road B–A is listed twice.');
	});

	it('reports too few towns for every guild to start on', () => {
		const kingdoms = base.kingdoms.filter(t => t.id !== 'A' && t.id !== 'B');
		expect(findMapProblems({...base, kingdoms})).toContain(
			'4 guilds × 4 towns need more than the 15 towns available.',
		);
	});

	it('reports a missing or second castle', () => {
		const noCastle = base.kingdoms.filter(t => t.kind !== 'castle');
		expect(findMapProblems({...base, kingdoms: noCastle})).toContain(
			'A map has exactly one castle.',
		);
		const twoCastles = [...base.kingdoms, {...castle(0, 0), id: 'Keep'}];
		expect(findMapProblems({...base, kingdoms: twoCastles})).toContain(
			'A map has exactly one castle.',
		);
	});

	it('reports fair holdings no four guilds could share', () => {
		expect(findMapProblems({...base, fairHoldings: {town: 25, dormitory: 11, castle: 1}})).toContain(
			'Fair holdings of 11 dormitory-days per guild cannot be.',
		);
		expect(findMapProblems({...base, fairHoldings: {town: 25, dormitory: 10, castle: 1.5}})).toContain(
			'Fair holdings of 1.5 castle-days per guild cannot be.',
		);
	});

	it('reports maps too large for share links', () => {
		const many = Array.from({length: 63}, (_, i) => town(`T${i}`, 0, 0));
		expect(findMapProblems({...base, kingdoms: many})).toContain(
			'A map can have at most 62 kingdoms.',
		);
	});

	it('refuses to compile a broken map', () => {
		expect(() => compileMap({...base, kingdoms: [...base.kingdoms, castle(0, 0)]})).toThrow(
			/Duplicate kingdom id "Darkwick"/u,
		);
	});
});

describe('the weekly rotation', () => {
	it('has every map once', () => {
		expect(ROTATION.toSorted((a, b) => a.id.localeCompare(b.id))).toEqual(
			MAPS.toSorted((a, b) => a.id.localeCompare(b.id)),
		);
	});

	it('goes Galaxy, Sea, then Sky', () => {
		expect(ROTATION.map(map => map.id)).toEqual([
			'galaxy-terminal',
			'sea-of-poseidon',
			'floating-city',
		]);
	});

	it('is anchored on a real map', () => {
		expect(findMap(ANCHOR_MAP_ID)).toBeDefined();
	});

	// Noon on the Wednesday of each week, counted from the anchor's.
	const wednesday = (week: number) => {
		const start = startOfWeek(ANCHOR_WEEK + week);
		return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12);
	};

	const place = ROTATION.findIndex(map => map.id === ANCHOR_MAP_ID);
	const nthAfterAnchor = (n: number) => ROTATION.at((place + n) % ROTATION.length)!.id;

	it('plays the anchor\'s map in its week, then follows the rotation round', () => {
		const weeks = [0, 1, 2, 3, 4].map(week => mapOfWeek(wednesday(week)).id);
		expect(weeks).toEqual([0, 1, 2, 3, 4].map(n => nthAfterAnchor(n)));
	});

	it('moves on to the next map on Wednesday, not while Tuesday shows the results', () => {
		const next = startOfWeek(ANCHOR_WEEK + 1);
		const lastMoment = new Date(next.getTime() - 1);
		expect(mapOfWeek(lastMoment).id).toBe(ANCHOR_MAP_ID);
		expect(mapOfWeek(next).id).toBe(nthAfterAnchor(1));
	});

	it('works back to weeks before the anchor', () => {
		// 40 weeks back is 13 turns of the rotation and one place more.
		expect(mapOfWeek(wednesday(-40)).id).toBe(nthAfterAnchor(ROTATION.length - 1));
	});
});
