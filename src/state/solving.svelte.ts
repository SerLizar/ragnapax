// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {Ownership} from '../domain/plan.ts';
import {
	PlannerClient,
	SolveCancelled,
	SolverUnavailable,
	type SolverClient,
} from '../solver/client.ts';
import type {SolveRequest} from '../solver/protocol.ts';
import type {PlanQuality} from '../solver/solve.ts';

export type SolvePhase =
	| {readonly phase: 'idle'}
	| {
		readonly phase: 'solving';
		readonly startedAt: number;
		readonly proven: boolean;
		readonly found: boolean;
	}
	| {
		readonly phase: 'failed';
		readonly reason: 'timeout' | 'infeasible' | 'unavailable' | 'error';
		/**
		For `error`: what went wrong, in English.
		*/
		readonly detail?: string;
	};

/**
Takes a plan the solver found. Throws if the plan cannot be used, which
stops the solve and reports the error.
*/
export type AcceptPlan = (owners: Ownership[], quality: PlanQuality) => void;

/**
Runs the solver, one solve at a time, and tracks how it is going. It knows
nothing of setups: `PlannerState` says what to solve and keeps the plans.
*/
export class Solving {
	private cancelJob: (() => void) | undefined;
	phase = $state.raw<SolvePhase>({phase: 'idle'});
	/**
	Whether the solver has finished downloading and compiling.
	*/
	ready = $state(false);

	constructor(private readonly client: SolverClient = new PlannerClient()) {
		this.client.onReady(() => {
			this.ready = true;
		});
	}

	/**
	Whether the running solve has proven its best plan fair.
	*/
	get isProven(): boolean {
		return this.phase.phase === 'solving' && this.phase.proven;
	}

	/**
	Starts downloading the solver, unless the user asked to save data.
	*/
	warmUp(): void {
		if ((navigator as {connection?: {saveData?: boolean}}).connection?.saveData) {
			return;
		}

		this.client.warmUp();
	}

	/**
	Solves `request`, abandoning any solve already running, and hands every
	plan found to `accept`, improvements included. Resolves true once solving
	is done with a plan; false if it was cancelled or failed, with `phase`
	saying how.
	*/
	async run(request: SolveRequest, accept: AcceptPlan): Promise<boolean> {
		this.cancel();
		// A plan that cannot be used arrives in a worker message, outside the
		// `try` below: stop the solve and report it there.
		let broken: unknown;
		const startedAt = performance.now();
		this.phase = {
			phase: 'solving', startedAt, proven: false, found: false,
		};
		const job = this.client.solve(request, {
			onImprovement: (owners, progress) => {
				try {
					accept(owners, progress.proven ? 'proven' : 'unproven');
				} catch (error) {
					broken = error;
					this.cancelJob?.();
					return;
				}

				this.phase = {
					phase: 'solving', startedAt, proven: progress.proven, found: true,
				};
			},
			onProgress: progress => {
				if (this.phase.phase === 'solving' && progress.proven !== this.phase.proven) {
					this.phase = {...this.phase, proven: progress.proven};
				}
			},
		});
		this.cancelJob = job.cancel;

		try {
			const outcome = await job.result;
			if (outcome.kind === 'solved') {
				accept(outcome.owners, outcome.quality);
				this.phase = {phase: 'idle'};
				return true;
			}

			this.phase = {phase: 'failed', reason: outcome.kind};
		} catch (error) {
			if (broken === undefined && error instanceof SolveCancelled) {
				return false;
			}

			const failure = broken ?? error;
			this.phase =
				failure instanceof SolverUnavailable
					? {phase: 'failed', reason: 'unavailable'}
					: {
						phase: 'failed',
						reason: 'error',
						detail: failure instanceof Error ? failure.message : String(failure),
					};
		} finally {
			if (this.cancelJob === job.cancel) {
				this.cancelJob = undefined;
			}
		}

		return false;
	}

	/**
	Abandons any running solve.
	*/
	cancel(): void {
		const {cancelJob} = this;
		this.cancelJob = undefined;
		if (cancelJob) {
			cancelJob();
			// That ended the worker, and the next one has to compile the solver
			// again, which takes a moment on an old phone: start it now, while
			// the player looks at the plan, rather than when they next plan.
			this.warmUp();
		}

		this.ready = this.client.ready;
		if (this.phase.phase === 'solving') {
			this.phase = {phase: 'idle'};
		}
	}
}
