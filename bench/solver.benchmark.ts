// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// Solves every map from several starting positions with every setting and
// prints how long it took and how fair the result is. Run with `npm run bench`
// after changing the model or adding a map; BENCH_STARTS sets how many random
// starting positions to try per map (default 4). Each plan is then made
// again after a day played off plan, from the old plan as the app does.

import process from 'node:process';
import loadHighs from 'highs';
import {assert, expect, it} from 'vitest';
import {
	continuePlan,
	followPlan,
	planFromTimeline,
	score,
	simulate,
	disturbances,
	startingOwnership,
} from '../src/domain/plan.ts';
import {GOALS, type PlanSettings} from '../src/domain/settings.ts';
import {MAPS} from '../src/maps/index.ts';
import {solvePlanningProblem, type SolveProgress} from '../src/solver/solve.ts';
import {randomStart} from '../src/test/random.ts';

const STARTS = Number(process.env.BENCH_STARTS ?? 4);
const SETTINGS: PlanSettings[] = GOALS.flatMap(goal => [
	{
		goal, fillMap: false, castleLast: false, inactive: [],
	},
	{
		goal, fillMap: true, castleLast: false, inactive: [],
	},
	{
		goal, fillMap: true, castleLast: true, inactive: [],
	},
	// A guild in the middle sits out, so the guild order skips it.
	{
		goal, fillMap: false, castleLast: false, inactive: [1],
	},
	{
		goal, fillMap: true, castleLast: false, inactive: [1],
	},
]);

it('solves every map quickly and fairly', async () => {
	const highs = await loadHighs();
	const rows: Array<Record<string, string | number>> = [];
	for (const map of MAPS) {
		for (let seed = 1; seed <= STARTS; seed++) {
			const start = startingOwnership(map, randomStart(map, seed));
			for (const settings of SETTINGS) {
				let firstPlan = NaN;
				let proven = NaN;
				// The proof often comes after the last better plan, so progress
				// reports count too.
				const noteProof = (progress: SolveProgress) => {
					if (progress.proven && Number.isNaN(proven)) {
						proven = progress.elapsed;
					}
				};

				const outcome = solvePlanningProblem(
					highs,
					{map, start, ...settings},
					{
						onImprovement(_, progress) {
							if (Number.isNaN(firstPlan)) {
								firstPlan = progress.elapsed;
							}

							noteProof(progress);
						},
						onProgress: noteProof,
					},
				);
				assert(outcome.kind === 'solved', `no plan: ${outcome.kind}`);

				const plan = planFromTimeline(map, outcome.owners);
				const timeline = simulate(map, start, plan);
				expect(timeline.violations).toEqual([]);
				expect(disturbances(timeline, settings.inactive)).toEqual([]);
				const scores = score(map, timeline);

				// Wednesday goes wrong: the first guild forgets to declare. Timed
				// until the proof only, as polishing is timed above.
				const [wednesday = []] = plan.declarations;
				const played = [followPlan(map, start, [[], ...wednesday.slice(1)])];
				let replanFirst = NaN;
				let replanProven = NaN;
				const replan = solvePlanningProblem(highs, {
					map, start, played, ...settings,
				}, {
					polishSeconds: 0,
					hint: continuePlan(map, [start, ...played], plan),
					onImprovement(_, progress) {
						if (Number.isNaN(replanFirst)) {
							replanFirst = progress.elapsed;
						}
					},
					onProgress(progress) {
						if (progress.proven && Number.isNaN(replanProven)) {
							replanProven = progress.elapsed;
						}
					},
				});
				assert(replan.kind === 'solved', `no plan again: ${replan.kind}`);
				expect(simulate(map, start, planFromTimeline(map, replan.owners)).violations).toEqual([]);

				const split = (f: (s: (typeof scores)[number]) => number) =>
					scores.map(s => f(s)).join('/');
				rows.push({
					map: map.id,
					seed,
					goal: settings.goal + (settings.fillMap ? '+fill' : '') + (settings.castleLast ? '+castle' : '')
						+ settings.inactive.map(g => `-g${g + 1}`).join(''),
					quality: outcome.quality,
					'first plan s': firstPlan.toFixed(1),
					'proven s': proven.toFixed(1),
					'total s': outcome.elapsed.toFixed(1),
					points: split(s => s.points),
					castle: split(s => s.held.castle),
					dorms: split(s => s.held.dormitory),
					towns: split(s => s.held.town),
					moves: scores.reduce((sum, s) => sum + s.declarations, 0),
					'replan first s': replanFirst.toFixed(2),
					'replan proven s': replanProven.toFixed(1),
				});
			}
		}
	}

	console.table(rows);
});
