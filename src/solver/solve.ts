// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {Highs} from 'highs';
import type {Ownership} from '../domain/plan.ts';
import {buildModel, TIE_BREAKER_BUDGET, type PlanningProblem} from './model.ts';

/**
How good a plan is known to be:
- `optimal`: nothing better exists, down to the declaration count.
- `proven`: fairness and total points are proven best; a plan with fewer
declarations might exist.
- `unproven`: the best plan found in the time available.
*/
export type PlanQuality = 'optimal' | 'proven' | 'unproven';

export type SolveProgress = {
	/**
	Seconds since the solve started.
	*/
	readonly elapsed: number;
	/**
	Whether fairness and points are already proven best.
	*/
	readonly proven: boolean;
};

export type SolveOutcome =
	| {
		readonly kind: 'solved';
		readonly quality: PlanQuality;
		readonly owners: Ownership[];
		readonly elapsed: number;
	}
	/**
	Ran out of time before finding any plan.
	*/
	| {readonly kind: 'timeout'; readonly elapsed: number}
	/**
	No plan satisfies the rules (should not happen on a valid map).
	*/
	| {readonly kind: 'infeasible'; readonly elapsed: number};

export type SolveOptions = {
	/**
	Hard stop for the whole solve.
	*/
	readonly timeLimitSeconds?: number;
	/**
	How long to keep cutting declarations once fairness and points are
	proven. Proving the declaration count optimal can take minutes for no
	practical benefit, so the solve stops after this long, or after as long
	as the proof took if that is longer, so slow devices polish as well.
	*/
	readonly polishSeconds?: number;
	/**
	A week to start from, such as the plan being made again after a day was
	played: the solver begins with it if it is still legal, so it has a good
	plan to improve on, and a bound to prove against, from the start.
	*/
	readonly hint?: readonly Ownership[];
	/**
	A better plan was found; the solve keeps going.
	*/
	onImprovement?(owners: Ownership[], progress: SolveProgress): void;
	onProgress?(progress: SolveProgress): void;
};

export function solvePlanningProblem(
	highs: Highs,
	problem: PlanningProblem,
	{
		timeLimitSeconds = 120, polishSeconds = 4, hint, onImprovement, onProgress,
	}: SolveOptions = {},
): SolveOutcome {
	const {milp, decode, encode} = buildModel(problem);
	const data = milp.toArrays();
	const finite = (a: Float64Array) =>
		a.map(v => (v === Infinity ? highs.infinity : (v === -Infinity ? -highs.infinity : v)));
	const started = performance.now();
	const elapsed = () => (performance.now() - started) / 1000;
	const {callbackType, modelStatus} = highs.constants;
	let provenAt: number | undefined;
	const progress = (): SolveProgress => ({
		elapsed: elapsed(),
		proven: provenAt !== undefined,
	});

	const observe = (bounds: {mip_primal_bound?: number; mip_dual_bound?: number}) => {
		const {mip_primal_bound: primal, mip_dual_bound: dual} = bounds;
		const isProven = primal !== undefined && dual !== undefined && primal - dual < TIE_BREAKER_BUDGET;
		if (provenAt !== undefined || !isProven) {
			return;
		}

		provenAt = elapsed();
		// Said at once: the proof may come in a callback that reports nothing
		// itself, and no other report may follow before the solve stops.
		onProgress?.(progress());
	};

	return highs.withModel(
		{
			...data,
			colLower: finite(data.colLower),
			colUpper: finite(data.colUpper),
			rowLower: finite(data.rowLower),
			rowUpper: finite(data.rowUpper),
			colNames: milp.names,
		},
		(model): SolveOutcome => {
			/* eslint-disable @typescript-eslint/naming-convention -- HiGHS option names */
			model.options.set({
				output_flag: false,
				time_limit: timeLimitSeconds,
				mip_rel_gap: 0,
				mip_abs_gap: 1e-6,
			});
			/* eslint-enable @typescript-eslint/naming-convention */
			// HiGHS checks the hint, and fills in the declarations and totals.
			if (hint) {
				model.setSolution(encode(hint));
			}

			const {modelStatus: status} = model.run({
				[callbackType.mipImprovingSolution](event) {
					observe(event.data);
					const values = event.data.mip_solution;
					if (values) {
						onImprovement?.(decode(values), progress());
					}

					return undefined;
				},
				[callbackType.mipLogging](event) {
					observe(event.data);
					onProgress?.(progress());
					return undefined;
				},
				[callbackType.mipInterrupt](event) {
					observe(event.data);
					if (provenAt !== undefined && elapsed() - provenAt >= Math.max(polishSeconds, provenAt)) {
						event.interrupt();
					}

					return undefined;
				},
			});

			const solved = (quality: PlanQuality): SolveOutcome => ({
				kind: 'solved',
				quality,
				owners: decode(model.getSolution().colValue),
				elapsed: elapsed(),
			});
			if (status === modelStatus.optimal) {
				return solved('optimal');
			}

			if (status === modelStatus.infeasible || status === modelStatus.unboundedOrInfeasible) {
				return {kind: 'infeasible', elapsed: elapsed()};
			}

			if (status === modelStatus.timeLimit || status === modelStatus.interrupted) {
				return model.info.get('primal_solution_status') === 2
					? solved(provenAt === undefined ? 'unproven' : 'proven')
					: {kind: 'timeout', elapsed: elapsed()};
			}

			throw new Error(`The solver stopped unexpectedly (status ${status}).`);
		},
	);
}
