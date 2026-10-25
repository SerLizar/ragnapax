// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {
	guildOrderMeasures,
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
		expect(priorities({goal: 'points', fillMap: false})).toEqual([
			gap('points'),
			TOTAL,
			gap('castle'),
			gap('dormitory'),
		]);
	});

	it('balances every kind of holding before points for equal resources', () => {
		expect(priorities({goal: 'resources', fillMap: false})).toEqual([
			gap('castle'),
			gap('dormitory'),
			gap('town'),
			TOTAL,
		]);
	});

	it('fills the map before anything else when asked', () => {
		for (const goal of ['points', 'resources'] as const) {
			expect(priorities({goal, fillMap: true})[0]).toEqual(TOTAL);
		}
	});
});

describe('refinements', () => {
	it('spreads leftover resources across guilds when filling the map', () => {
		expect(refinements({goal: 'resources', fillMap: true})).toEqual([gap('points')]);
		expect(refinements({goal: 'resources', fillMap: false})).toEqual([]);
		for (const isFillMap of [false, true]) {
			expect(refinements({goal: 'points', fillMap: isFillMap})).toEqual([]);
		}
	});
});

describe('guildOrderMeasures', () => {
	it('only orders guilds when filling the map', () => {
		expect(guildOrderMeasures({goal: 'points', fillMap: false})).toEqual([]);
		expect(guildOrderMeasures({goal: 'points', fillMap: true})).toEqual(['points']);
		expect(guildOrderMeasures({goal: 'resources', fillMap: true})).toEqual(['points']);
	});
});
