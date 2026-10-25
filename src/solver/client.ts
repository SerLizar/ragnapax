// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {Ownership} from '../domain/plan.ts';
import type {SolveRequest, WorkerRequest, WorkerResponse} from './protocol.ts';
import type {SolveOutcome, SolveProgress} from './solve.ts';

export type SolveHandlers = {
	onImprovement(owners: Ownership[], progress: SolveProgress): void;
	onProgress(progress: SolveProgress): void;
};

export type SolveJob = {
	readonly result: Promise<SolveOutcome>;
	/**
	Stops the solve. The result promise rejects with `SolveCancelled`.
	*/
	cancel(): void;
};

export class SolveCancelled extends Error {
	override name = 'SolveCancelled';
}

/**
The solver could not be downloaded or started, usually for want of a connection.
*/
export class SolverUnavailable extends Error {
	override name = 'SolverUnavailable';
}

/**
What `PlannerState` needs from a solver, so tests can stand one in.
*/
export type SolverClient = Pick<PlannerClient, 'ready' | 'onReady' | 'warmUp' | 'solve'>;

/**
Runs the planner in a Web Worker so the page stays responsive.
HiGHS cannot be interrupted from outside while it runs, so cancelling
terminates the worker and the next solve starts a fresh one.
*/
export class PlannerClient {
	private worker: Worker | undefined;
	private readonly readyListeners = new Set<() => void>();
	/**
	Cancels the solve still running, if any.
	*/
	private cancelRunning: (() => void) | undefined;

	ready = false;

	private spawn(): Worker {
		if (this.worker) {
			return this.worker;
		}

		const worker = new Worker(new URL('worker.ts', import.meta.url), {
			type: 'module',
		});
		worker.addEventListener('message', ({data}: MessageEvent<WorkerResponse>) => {
			if (data.type === 'error' && data.fatal) {
				this.discard(worker);
			}

			if (data.type !== 'ready') {
				return;
			}

			this.ready = true;
			this.readyListeners.forEach(l => {
				l();
			});
		});
		// A worker whose script failed to load is useless; start afresh next time.
		worker.addEventListener('error', () => {
			this.discard(worker);
		});
		this.worker = worker;
		return worker;
	}

	private discard(worker: Worker): void {
		worker.terminate();
		if (this.worker !== worker) {
			return;
		}

		this.worker = undefined;
		this.ready = false;
	}

	/**
	Starts fetching the solver in the background. Safe to call repeatedly.
	*/
	warmUp(): void {
		this.spawn();
	}

	onReady(listener: () => void): () => void {
		this.readyListeners.add(listener);
		return () => {
			this.readyListeners.delete(listener);
		};
	}

	/**
	Solves `request`, cancelling any solve still running first: a worker's
	messages do not say which solve they belong to, so it runs one at a time.
	*/
	solve(request: SolveRequest, handlers: SolveHandlers): SolveJob {
		this.cancelRunning?.();
		const worker = this.spawn();
		let settle: {resolve(outcome: SolveOutcome): void; reject(error: Error): void};
		const result = new Promise<SolveOutcome>((resolve, reject) => {
			settle = {resolve, reject};
		});

		const listener = ({data}: MessageEvent<WorkerResponse>) => {
			switch (data.type) {
				case 'improvement': {
					handlers.onImprovement(data.owners, data.progress);
					return;
				}

				case 'progress': {
					handlers.onProgress(data.progress);
					return;
				}

				case 'done': {
					cleanup();
					settle.resolve(data.outcome);
					return;
				}

				case 'ready': {
					return; // Handled once per worker, in `spawn`
				}

				case 'error': {
					cleanup();
					settle.reject(data.fatal ? new SolverUnavailable(data.message) : new Error(data.message));
				}
			}
		};

		const crashed = () => {
			this.discard(worker);
			cleanup();
			settle.reject(new SolverUnavailable('The solver worker failed to load.'));
		};

		let isSettled = false;
		const cleanup = () => {
			isSettled = true;
			if (this.cancelRunning === cancel) {
				this.cancelRunning = undefined;
			}

			worker.removeEventListener('message', listener);
			worker.removeEventListener('error', crashed);
		};

		const cancel = () => {
			// A finished solve leaves the worker loaded and idle: keep it.
			if (isSettled) {
				return;
			}

			cleanup();
			this.discard(worker);
			settle.reject(new SolveCancelled());
		};

		worker.addEventListener('message', listener);
		worker.addEventListener('error', crashed);
		worker.postMessage({type: 'solve', ...request} satisfies WorkerRequest);
		this.cancelRunning = cancel;
		return {result, cancel};
	}
}
