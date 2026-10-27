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
	type GuildScore,
	type Ownership,
} from '../domain/plan.ts';
import {
	DEFAULT_SETTINGS,
	priorities,
	type Goal,
	type PlanSettings,
} from '../domain/settings.ts';
import {
	DAYS,
	GUILDS,
	POINTS,
	KINGDOM_KINDS,
	TOWNS_PER_GUILD,
	type Holdings,
} from '../domain/types.ts';
import {DEFAULT_MAP as map, MAPS} from '../maps/index.ts';
import {FLOATING_CITY_START} from '../test/fixtures.ts';
import {randomStart} from '../test/random.ts';
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
				map, start, goal, fillMap: false, castleLast: false, inactive: [], fewestDays: false,
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
			map, start, goal, fillMap: false, castleLast: false, inactive: [], fewestDays: false,
		});
		const full = solvePlanningProblem(highs, {
			map, start, goal, fillMap: true, castleLast: false, inactive: [], fewestDays: false,
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
			map, start, goal, fillMap: true, castleLast: true, inactive: [], fewestDays: false,
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

describe.each<Goal>(['points', 'resources'])('declaring on the fewest days, for equal %s', goal => {
	const start = startingOwnership(map, FLOATING_CITY_START);

	// Polishing is a search, so a plan made from scratch may come out with
	// more days than the usual one. Started from the usual plan, it can only
	// improve on it.
	it('keeps every priority and never asks for more days with declares', () => {
		const solve = (isFewestDays: boolean, hint?: Ownership[]) => {
			const outcome = solvePlanningProblem(highs, {
				map, start, goal, fillMap: false, castleLast: false, inactive: [], fewestDays: isFewestDays,
			}, {hint});
			expect(outcome.kind === 'solved' && outcome.quality).not.toBe('unproven');
			if (outcome.kind !== 'solved') {
				throw new Error('no plan');
			}

			const plan = planFromTimeline(map, outcome.owners);
			const timeline = simulate(map, start, plan);
			expect(timeline.violations).toEqual([]);
			return {
				owners: outcome.owners,
				scores: score(map, timeline),
				days: plan.declarations.flat().filter(targets => targets.length > 0).length,
			};
		};

		const usual = solve(false);
		const fewest = solve(true, usual.owners);
		// What the priorities measure: each gap, and everyone's points together.
		const ranked = (scores: readonly GuildScore[]) =>
			priorities({...DEFAULT_SETTINGS, goal}).map(c => {
				if (c.kind === 'total') {
					return scores.reduce((sum, s) => sum + s.points, 0);
				}

				const values = scores.map(s => (c.measure === 'points' ? s.points : s.held[c.measure]));
				return Math.max(...values) - Math.min(...values);
			});
		expect(ranked(fewest.scores)).toEqual(ranked(usual.scores));
		expect(fewest.days).toBeLessThanOrEqual(usual.days);
	});
});

describe.each<Goal>(['points', 'resources'])('with a guild sitting out, for equal %s', goal => {
	const start = startingOwnership(map, FLOATING_CITY_START);
	const spread = (scores: readonly GuildScore[], f: (s: GuildScore) => number) =>
		Math.max(...scores.map(s => f(s))) - Math.min(...scores.map(s => f(s)));

	// Tie-breakers are not checked, so these stop polishing once proven.
	it('leaves it alone and shares fairly between the others', () => {
		const outcome = solvePlanningProblem(highs, {
			map, start, goal, fillMap: false, castleLast: false, inactive: [3], fewestDays: false,
		}, {polishSeconds: 0});
		expect(outcome.kind === 'solved' && outcome.quality).not.toBe('unproven');
		if (outcome.kind !== 'solved') {
			throw new Error('no plan');
		}

		const timeline = simulate(map, start, planFromTimeline(map, outcome.owners));
		expect(timeline.violations).toEqual([]);
		expect(disturbances(timeline, [3])).toEqual([]);
		const scores = score(map, timeline);
		// Its starting towns, all week, and nothing else.
		expect(scores[3]).toMatchObject({points: DAYS * TOWNS_PER_GUILD, declarations: 0});
		const playing = scores.slice(0, 3);
		expect(
			goal === 'points'
				? spread(playing, s => s.points)
				: KINGDOM_KINDS.reduce((sum, kind) => sum + spread(playing, s => s.held[kind]), 0),
		).toBe(0);
	});

	it('keeps the guild order among the guilds that play when filling the map', () => {
		const outcome = solvePlanningProblem(highs, {
			map, start, goal, fillMap: true, castleLast: true, inactive: [1], fewestDays: false,
		}, {polishSeconds: 0});
		if (outcome.kind !== 'solved') {
			throw new Error('no plan');
		}

		const timeline = simulate(map, start, planFromTimeline(map, outcome.owners));
		expect(disturbances(timeline, [1])).toEqual([]);
		const scores = score(map, timeline);
		const playing = [scores[0]!, scores[2]!, scores[3]!];
		for (let g = 0; g + 1 < playing.length; g++) {
			expect(playing[g]!.points).toBeGreaterThanOrEqual(playing[g + 1]!.points);
			expect(playing[g]!.held.castle).toBeLessThanOrEqual(playing[g + 1]!.held.castle);
		}
	});
});

describe('holdings set by hand', () => {
	const start = startingOwnership(map, FLOATING_CITY_START);
	// Tie-breakers are not checked, so these stop polishing once proven.
	const solve = (settings: PlanSettings) => {
		const outcome = solvePlanningProblem(highs, {map, start, ...settings}, {polishSeconds: 0});
		expect(outcome.kind === 'solved' && outcome.quality).not.toBe('unproven');
		if (outcome.kind !== 'solved') {
			throw new Error('no plan');
		}

		const timeline = simulate(map, start, planFromTimeline(map, outcome.owners));
		expect(timeline.violations).toEqual([]);
		return score(map, timeline).map(s => s.held);
	};

	// The defaults when holdings are set by hand.
	it.each(MAPS)('start from the fair holdings of $id, as equal resources makes them', other => {
		const opening = startingOwnership(other, randomStart(other, 1));
		const outcome = solvePlanningProblem(highs, {map: other, start: opening, ...DEFAULT_SETTINGS}, {
			polishSeconds: 0,
		});
		if (outcome.kind !== 'solved') {
			throw new Error('no plan');
		}

		const scores = score(other, simulate(other, opening, planFromTimeline(other, outcome.owners)));
		expect(scores.map(s => s.held)).toEqual(GUILDS.map(() => other.fairHoldings));
	});

	it('gets uneven holdings exactly when a plan can', () => {
		// Holdings a plan has, uneven since it uses every kingdom.
		const targets = solve({...DEFAULT_SETTINGS, fillMap: true});
		expect(new Set(targets.map(held => JSON.stringify(held))).size).toBeGreaterThan(1);
		expect(solve({...DEFAULT_SETTINGS, targets})).toEqual(targets);
	});

	it('comes as close as it can to holdings no plan can reach', () => {
		// The castle every day for everyone, and nothing else.
		const targets: Holdings[] = GUILDS.map(() => ({town: 0, dormitory: 0, castle: DAYS}));
		const held = solve({...DEFAULT_SETTINGS, targets});
		const sum = (holdings: readonly Holdings[], kind: keyof Holdings) =>
			holdings.reduce((total, h) => total + h[kind], 0);
		// The castle held on more days than when shared out, though dorms on
		// the way to it count against the plan, and no more towns than the
		// starting ones.
		expect(sum(held, 'castle')).toBeGreaterThan(GUILDS.length * map.fairHoldings.castle);
		expect(held.every(h => h.town <= DAYS * TOWNS_PER_GUILD)).toBe(true);
	});

	it('leaves guilds sitting out what they hold, whatever is set for them', () => {
		const targets: Holdings[] = GUILDS.map(() => map.fairHoldings);
		const held = solve({...DEFAULT_SETTINGS, inactive: [2], targets});
		expect(held[2]).toEqual({town: DAYS * TOWNS_PER_GUILD, dormitory: 0, castle: 0});
		expect(held.filter((_, g) => g !== 2)).toEqual([0, 1, 3].map(() => map.fairHoldings));
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
			inactive: [],
			fewestDays: false,
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
		const timeline = simulate(map, start, planFromTimeline(map, outcome.owners));
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

		const hint = continuePlan(map, [start, wednesday], planFromTimeline(map, first.owners));
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
		expect(simulate(map, start, planFromTimeline(map, hint)).violations).not.toEqual([]);
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
			inactive: [],
			fewestDays: false,
		});
		expect(outcome.kind).toBe('solved');
		if (outcome.kind === 'solved') {
			expect(outcome.owners[1]).toEqual(wednesday);
		}
	});
});
