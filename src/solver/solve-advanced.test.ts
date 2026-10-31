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
	planFromTimeline,
	score,
	simulate,
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

			const plan = planFromTimeline(outcome.owners);
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

describe('holdings set by hand', () => {
	const start = startingOwnership(map, FLOATING_CITY_START);
	// Tie-breakers are not checked, so these stop polishing once proven.
	const solve = (settings: PlanSettings) => {
		const outcome = solvePlanningProblem(highs, {map, start, ...settings}, {polishSeconds: 0});
		expect(outcome.kind === 'solved' && outcome.quality).not.toBe('unproven');
		if (outcome.kind !== 'solved') {
			throw new Error('no plan');
		}

		const timeline = simulate(map, start, planFromTimeline(outcome.owners));
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

		const scores = score(other, simulate(other, opening, planFromTimeline(outcome.owners)));
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
