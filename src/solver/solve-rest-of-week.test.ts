// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import loadHighs from 'highs';
import {
	beforeAll,
	describe,
	expect,
	it,
} from 'vitest';
import {
	continuePlan,
	followPlan,
	planFromTimeline,
	score,
	simulate,
	disturbances,
	startingOwnership,
	type Ownership,
} from '../domain/plan.ts';
import {GUILDS} from '../domain/types.ts';
import {DEFAULT_MAP as map} from '../maps/index.ts';
import {FLOATING_CITY_START} from '../test/fixtures.ts';
import {solvePlanningProblem} from './solve.ts';

let highs: Awaited<ReturnType<typeof loadHighs>>;
beforeAll(async () => {
	highs = await loadHighs();
});

describe('planning the rest of the week', () => {
	const idx = (id: string) => map.indexOf(id)!;
	const start = startingOwnership(map, FLOATING_CITY_START);
	// Wednesday went one guild's way: it took two dorms, the others nothing.
	const wednesday = followPlan(map, start, [[idx('Vagastrom'), idx('Dionysia')], [], [], []]);

	it('keeps the days played and evens points out over the whole week', () => {
		const outcome = solvePlanningProblem(highs, {
			map,
			start,
			played: [wednesday],
			goal: 'points',
			fillMap: false,
			castleLast: false,
			inactive: [],
			fewestDays: false,
		});
		expect(outcome.kind).toBe('solved');
		if (outcome.kind !== 'solved') {
			return;
		}

		expect(outcome.quality).not.toBe('unproven');
		expect(outcome.owners.slice(0, 2)).toEqual([start, wednesday]);
		const timeline = simulate(map, start, planFromTimeline(outcome.owners));
		expect(timeline.violations).toEqual([]);
		const points = score(map, timeline).map(s => s.points);
		expect(Math.max(...points) - Math.min(...points)).toBe(0);
	});

	it('leaves a guild that sits out after a day played with what it took', () => {
		const outcome = solvePlanningProblem(highs, {
			map,
			start,
			played: [wednesday],
			goal: 'points',
			fillMap: false,
			castleLast: false,
			inactive: [0],
			fewestDays: false,
		}, {polishSeconds: 0});
		if (outcome.kind !== 'solved') {
			throw new Error('no plan');
		}

		expect(outcome.owners.slice(1).every(owners => owners[idx('Vagastrom')] === 0 && owners[idx('Dionysia')] === 0)).toBe(true);
		const timeline = simulate(map, start, planFromTimeline(outcome.owners));
		expect(disturbances(timeline, [0], 2)).toEqual([]);
		const points = score(map, timeline).slice(1).map(s => s.points);
		expect(Math.max(...points) - Math.min(...points)).toBe(0);
	});

	it('starts from a week it is given, if the rules allow it', () => {
		const first = solvePlanningProblem(highs, {
			map, start, goal: 'points', fillMap: false, castleLast: false, inactive: [], fewestDays: false,
		}, {polishSeconds: 0});
		if (first.kind !== 'solved') {
			throw new Error('no plan');
		}

		const hint = continuePlan(map, [start, wednesday], planFromTimeline(first.owners));
		const found: Ownership[][] = [];
		const outcome = solvePlanningProblem(
			highs,
			{
				map, start, played: [wednesday], goal: 'points', fillMap: false, castleLast: false, inactive: [], fewestDays: false,
			},
			{
				hint,
				polishSeconds: 0,
				onImprovement(owners) {
					found.push(owners);
				},
			},
		);
		expect(found[0]).toEqual(hint);
		expect(outcome.kind === 'solved' && outcome.quality).not.toBe('unproven');
	});

	it('ignores a week it is given that breaks the rules', () => {
		// A guild with nothing next to the castle holds it from Thursday on.
		const castle = map.kingdoms[idx('Darkwick')]!;
		const far = GUILDS.find(g => castle.neighbors.every(n => wednesday[n] !== g))!;
		const hint = continuePlan(map, [start, wednesday], {declarations: []})
			.map((owners, d) => (d < 2 ? owners : owners.map((o, t) => (t === castle.index ? far : o))));
		expect(simulate(map, start, planFromTimeline(hint)).violations).not.toEqual([]);
		const found: Ownership[][] = [];
		const outcome = solvePlanningProblem(
			highs,
			{
				map, start, played: [wednesday], goal: 'points', fillMap: false, castleLast: false, inactive: [], fewestDays: false,
			},
			{
				hint,
				polishSeconds: 0,
				onImprovement(owners) {
					found.push(owners);
				},
			},
		);
		expect(found).not.toContainEqual(hint);
		if (outcome.kind !== 'solved') {
			throw new Error('no plan');
		}

		const timeline = simulate(map, start, planFromTimeline(outcome.owners));
		expect(timeline.violations).toEqual([]);
		const points = score(map, timeline).map(s => s.points);
		expect(Math.max(...points) - Math.min(...points)).toBe(0);
	});

	it('can still use every kingdom, without a guild order it may no longer meet', () => {
		const outcome = solvePlanningProblem(highs, {
			map,
			start,
			played: [wednesday],
			goal: 'resources',
			fillMap: true,
			castleLast: false,
			inactive: [],
			fewestDays: false,
		});
		expect(outcome.kind).toBe('solved');
		if (outcome.kind === 'solved') {
			expect(outcome.owners[1]).toEqual(wednesday);
		}
	});
});
