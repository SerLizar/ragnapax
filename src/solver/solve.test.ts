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
	startingOwnership,
	type Ownership,
} from '../domain/plan.ts';
import type {Goal} from '../domain/settings.ts';
import {GUILDS, POINTS, KINGDOM_KINDS} from '../domain/types.ts';
import {DEFAULT_MAP as map} from '../maps/index.ts';
import {FLOATING_CITY_START} from '../test/fixtures.ts';
import {solvePlanningProblem} from './solve.ts';

let highs: Awaited<ReturnType<typeof loadHighs>>;
beforeAll(async () => {
	highs = await loadHighs();
});

describe.each<Goal>(['points', 'resources'])('solving for equal %s', goal => {
	it('finds a legal plan that shares evenly', () => {
		const start = startingOwnership(map, FLOATING_CITY_START);
		const reports: boolean[] = [];
		const outcome = solvePlanningProblem(
			highs,
			{
				map, start, goal, fillMap: false, castleLast: false,
			},
			{
				onProgress({proven}) {
					reports.push(proven);
				},
				onImprovement(_, {proven}) {
					reports.push(proven);
				},
			},
		);
		expect(outcome.kind).toBe('solved');
		if (outcome.kind !== 'solved') {
			return;
		}

		expect(outcome.quality).not.toBe('unproven');
		// Whoever watches the solve hears of the proof before it ends.
		if (outcome.quality === 'proven') {
			expect(reports).toContain(true);
		}

		const plan = planFromTimeline(map, outcome.owners);
		const timeline = simulate(map, start, plan);
		expect(timeline.violations).toEqual([]);
		expect(timeline.owners).toEqual(outcome.owners);

		const scores = score(map, timeline);
		const spread = (f: (s: (typeof scores)[number]) => number) =>
			Math.max(...scores.map(s => f(s))) - Math.min(...scores.map(s => f(s)));
		if (goal === 'points') {
			expect(spread(s => s.points)).toBe(0);
			// Nobody hogs the castle or the dormitories to make the numbers add up.
			expect(spread(s => s.held.castle)).toBeLessThanOrEqual(1);
			expect(spread(s => s.held.dormitory)).toBeLessThanOrEqual(1);
		} else {
			for (const k of ['town', 'dormitory', 'castle'] as const) {
				expect(spread(s => s.held[k])).toBe(0);
			}
		}
	});

	it('can use every kingdom, handing extras out in guild order', () => {
		const start = startingOwnership(map, FLOATING_CITY_START);
		const fair = solvePlanningProblem(highs, {
			map, start, goal, fillMap: false, castleLast: false,
		});
		const full = solvePlanningProblem(highs, {
			map, start, goal, fillMap: true, castleLast: false,
		});
		expect(full.kind === 'solved' && full.quality).not.toBe('unproven');
		if (fair.kind !== 'solved' || full.kind !== 'solved') {
			throw new Error('no plan');
		}

		const scoresOf = (owners: typeof full.owners) =>
			score(map, simulate(map, start, planFromTimeline(map, owners)));
		const total = (owners: typeof full.owners) =>
			scoresOf(owners).reduce((sum, s) => sum + s.points, 0);
		expect(total(full.owners)).toBeGreaterThan(total(fair.owners));

		const scores = scoresOf(full.owners);
		for (let g = 0; g + 1 < scores.length; g++) {
			expect(scores[g]!.points).toBeGreaterThanOrEqual(scores[g + 1]!.points);
		}

		// Leftover days of different kinds go to different guilds rather than
		// piling onto one, so points end up closer than the kinds' gaps add up to.
		if (goal !== 'resources') {
			return;
		}

		const spread = (f: (s: (typeof scores)[number]) => number) =>
			Math.max(...scores.map(s => f(s))) - Math.min(...scores.map(s => f(s)));
		const stacked = KINGDOM_KINDS.reduce(
			(sum, k) => sum + (POINTS[k] * spread(s => s.held[k])),
			0,
		);
		expect(spread(s => s.points)).toBeLessThan(stacked);
	});

	it('can hand extra castle-days to the last guilds, points still in guild order', () => {
		const start = startingOwnership(map, FLOATING_CITY_START);
		const outcome = solvePlanningProblem(highs, {
			map, start, goal, fillMap: true, castleLast: true,
		});
		expect(outcome.kind === 'solved' && outcome.quality).not.toBe('unproven');
		if (outcome.kind !== 'solved') {
			throw new Error('no plan');
		}

		const scores = score(map, simulate(map, start, planFromTimeline(map, outcome.owners)));
		for (let g = 0; g + 1 < scores.length; g++) {
			expect(scores[g]!.points).toBeGreaterThanOrEqual(scores[g + 1]!.points);
			expect(scores[g]!.held.castle).toBeLessThanOrEqual(scores[g + 1]!.held.castle);
		}

		// This opening leaves an extra castle-day, or the test would prove nothing.
		expect(scores.at(-1)!.held.castle).toBeGreaterThan(scores[0]!.held.castle);
	});
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
		});
		expect(outcome.kind).toBe('solved');
		if (outcome.kind !== 'solved') {
			return;
		}

		expect(outcome.quality).not.toBe('unproven');
		expect(outcome.owners.slice(0, 2)).toEqual([start, wednesday]);
		const timeline = simulate(map, start, planFromTimeline(map, outcome.owners));
		expect(timeline.violations).toEqual([]);
		const points = score(map, timeline).map(s => s.points);
		expect(Math.max(...points) - Math.min(...points)).toBe(0);
	});

	it('starts from a week it is given, if the rules allow it', () => {
		const first = solvePlanningProblem(highs, {
			map, start, goal: 'points', fillMap: false, castleLast: false,
		}, {polishSeconds: 0});
		if (first.kind !== 'solved') {
			throw new Error('no plan');
		}

		const hint = continuePlan(map, [start, wednesday], planFromTimeline(map, first.owners));
		const found: Ownership[][] = [];
		const outcome = solvePlanningProblem(
			highs,
			{
				map, start, played: [wednesday], goal: 'points', fillMap: false, castleLast: false,
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
		expect(simulate(map, start, planFromTimeline(map, hint)).violations).not.toEqual([]);
		const found: Ownership[][] = [];
		const outcome = solvePlanningProblem(
			highs,
			{
				map, start, played: [wednesday], goal: 'points', fillMap: false, castleLast: false,
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

		const timeline = simulate(map, start, planFromTimeline(map, outcome.owners));
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
		});
		expect(outcome.kind).toBe('solved');
		if (outcome.kind === 'solved') {
			expect(outcome.owners[1]).toEqual(wednesday);
		}
	});
});
