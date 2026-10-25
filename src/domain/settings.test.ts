// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {
	guildOrders,
	priorities,
	refinements,
	type Criterion,
	type Measure,
} from './settings.ts';

const gap = (measure: Measure): Criterion => ({kind: 'gap', measure});
const TOTAL: Criterion = {kind: 'total'};

// These orders are in "Settings and priorities" in docs/SOLVER.md; keep both in step.
describe('priorities', () => {
	it('puts equal points first, then everyone\'s points, then fair holdings', () => {
		expect(priorities({goal: 'points', fillMap: false, castleLast: false})).toEqual([
			gap('points'),
			TOTAL,
			gap('castle'),
			gap('dormitory'),
		]);
	});

	it('balances every kind of holding before points for equal resources', () => {
		expect(priorities({goal: 'resources', fillMap: false, castleLast: false})).toEqual([
			gap('castle'),
			gap('dormitory'),
			gap('town'),
			TOTAL,
		]);
	});

	it('fills the map before anything else when asked', () => {
		for (const goal of ['points', 'resources'] as const) {
			expect(priorities({goal, fillMap: true, castleLast: false})[0]).toEqual(TOTAL);
		}
	});
});

describe('refinements', () => {
	it('spreads leftover resources across guilds when filling the map', () => {
		expect(refinements({goal: 'resources', fillMap: true, castleLast: false})).toEqual([gap('points')]);
		expect(refinements({goal: 'resources', fillMap: false, castleLast: false})).toEqual([]);
		for (const isFillMap of [false, true]) {
			expect(refinements({goal: 'points', fillMap: isFillMap, castleLast: false})).toEqual([]);
		}
	});
});

describe('guildOrders', () => {
	const points = {measure: 'points', ascending: false};

	it('only orders guilds when filling the map', () => {
		for (const isCastleLast of [false, true]) {
			expect(guildOrders({goal: 'points', fillMap: false, castleLast: isCastleLast})).toEqual([]);
		}

		for (const goal of ['points', 'resources'] as const) {
			expect(guildOrders({goal, fillMap: true, castleLast: false})).toEqual([points]);
		}
	});

	it('can hand extra castle-days to the last guilds, keeping points in order', () => {
		expect(guildOrders({goal: 'resources', fillMap: true, castleLast: true})).toEqual([
			points,
			{measure: 'castle', ascending: true},
		]);
	});
});
