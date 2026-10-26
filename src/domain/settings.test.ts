// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {
	activeGuilds,
	efforts,
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
		expect(priorities({
			goal: 'points', fillMap: false, castleLast: false, inactive: [], fewestDays: false,
		})).toEqual([
			gap('points'),
			TOTAL,
			gap('castle'),
			gap('dormitory'),
		]);
	});

	it('balances every kind of holding before points for equal resources', () => {
		expect(priorities({
			goal: 'resources', fillMap: false, castleLast: false, inactive: [], fewestDays: false,
		})).toEqual([
			gap('castle'),
			gap('dormitory'),
			gap('town'),
			TOTAL,
		]);
	});

	it('fills the map before anything else when asked', () => {
		for (const goal of ['points', 'resources'] as const) {
			expect(priorities({
				goal, fillMap: true, castleLast: false, inactive: [], fewestDays: false,
			})[0]).toEqual(TOTAL);
		}
	});
});

describe('refinements', () => {
	it('spreads leftover resources across guilds when filling the map', () => {
		expect(refinements({
			goal: 'resources', fillMap: true, castleLast: false, inactive: [], fewestDays: false,
		})).toEqual([gap('points')]);
		expect(refinements({
			goal: 'resources', fillMap: false, castleLast: false, inactive: [], fewestDays: false,
		})).toEqual([]);
		for (const isFillMap of [false, true]) {
			expect(refinements({
				goal: 'points', fillMap: isFillMap, castleLast: false, inactive: [], fewestDays: false,
			})).toEqual([]);
		}
	});
});

describe('activeGuilds', () => {
	it('lists the guilds that play, in guild order', () => {
		expect(activeGuilds({inactive: []})).toEqual([0, 1, 2, 3]);
		expect(activeGuilds({inactive: [1, 3]})).toEqual([0, 2]);
	});
});

describe('efforts', () => {
	it('keeps declarations down last, after the days with any when asked', () => {
		expect(efforts({fewestDays: false})).toEqual(['declarations']);
		expect(efforts({fewestDays: true})).toEqual(['days', 'declarations']);
	});
});

describe('guildOrders', () => {
	const points = {measure: 'points', ascending: false};

	it('only orders guilds when filling the map', () => {
		for (const isCastleLast of [false, true]) {
			expect(guildOrders({
				goal: 'points', fillMap: false, castleLast: isCastleLast, inactive: [], fewestDays: false,
			})).toEqual([]);
		}

		for (const goal of ['points', 'resources'] as const) {
			expect(guildOrders({
				goal, fillMap: true, castleLast: false, inactive: [], fewestDays: false,
			})).toEqual([points]);
		}
	});

	it('can hand extra castle-days to the last guilds, keeping points in order', () => {
		expect(guildOrders({
			goal: 'resources', fillMap: true, castleLast: true, inactive: [], fewestDays: false,
		})).toEqual([
			points,
			{measure: 'castle', ascending: true},
		]);
	});
});
