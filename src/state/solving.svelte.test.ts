// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import type {Ownership} from '../domain/plan.ts';
import {
	SolveCancelled,
	SolverUnavailable,
	type SolveHandlers,
	type SolverClient,
} from '../solver/client.ts';
import type {SolveRequest} from '../solver/protocol.ts';
import type {SolveOutcome} from '../solver/solve.ts';
import {Solving} from './solving.svelte.ts';

const request: SolveRequest = {
	mapId: 'floating-city',
	start: [],
	played: [],
	settings: {
		goal: 'points', fillMap: false, castleLast: false, inactive: [], fewestDays: false,
	},
};
const owners: Ownership[] = [[0, 1]];

/**
A solver whose solve the test finishes by hand.
*/
function fakeClient() {
	let handlers: SolveHandlers | undefined;
	let settle: {resolve(outcome: SolveOutcome): void; reject(error: Error): void} | undefined;
	let warmUps = 0;
	const client: SolverClient = {
		ready: true,
		onReady: () => () => undefined,
		warmUp() {
			warmUps++;
		},
		solve(_request, h) {
			handlers = h;
			return {
				result: new Promise<SolveOutcome>((resolve, reject) => {
					settle = {resolve, reject};
				}),
				cancel() {
					settle?.reject(new SolveCancelled());
				},
			};
		},
	};
	return {
		client,
		improve(isProven: boolean) {
			handlers?.onImprovement(owners, {elapsed: 0, proven: isProven});
		},
		finish: (outcome: SolveOutcome) => settle?.resolve(outcome),
		fail: (error: Error) => settle?.reject(error),
		warmUps: () => warmUps,
	};
}

describe('Solving', () => {
	it('hands over every plan and ends idle once solved', async () => {
		const fake = fakeClient();
		const solving = new Solving(fake.client);
		const accepted: string[] = [];
		const done = solving.run(request, (_owners, quality) => {
			accepted.push(quality);
		});
		expect(solving.phase).toMatchObject({phase: 'solving', found: false});

		fake.improve(true);
		expect(solving.phase).toMatchObject({phase: 'solving', found: true, proven: true});
		fake.finish({
			kind: 'solved', quality: 'optimal', owners, elapsed: 1,
		});
		expect(await done).toBe(true);
		expect(accepted).toEqual(['proven', 'optimal']);
		expect(solving.phase).toEqual({phase: 'idle'});
	});

	it('says whether the plan is proven, until cancelled', async () => {
		const fake = fakeClient();
		const solving = new Solving(fake.client);
		const done = solving.run(request, () => undefined);
		fake.improve(false);
		expect(solving.isProven).toBe(false);
		fake.improve(true);
		expect(solving.isProven).toBe(true);
		solving.cancel();
		expect(await done).toBe(false);
		expect(solving.phase).toEqual({phase: 'idle'});
		expect(solving.isProven).toBe(false);
	});

	it('starts loading the next solver as soon as a solve is cancelled', async () => {
		const fake = fakeClient();
		const solving = new Solving(fake.client);
		solving.cancel();
		expect(fake.warmUps()).toBe(0);

		const done = solving.run(request, () => undefined);
		solving.cancel();
		await done;
		expect(fake.warmUps()).toBe(1);

		// A solve that ended by itself leaves its worker loaded.
		const finished = solving.run(request, () => undefined);
		fake.finish({kind: 'timeout', elapsed: 120});
		await finished;
		solving.cancel();
		expect(fake.warmUps()).toBe(1);
	});

	it.each([
		['timeout', {kind: 'timeout', elapsed: 120}],
		['infeasible', {kind: 'infeasible', elapsed: 1}],
	] as const)('reports a solve that ends with no plan: %s', async (reason, outcome) => {
		const fake = fakeClient();
		const solving = new Solving(fake.client);
		const done = solving.run(request, () => undefined);
		fake.finish(outcome);
		expect(await done).toBe(false);
		expect(solving.phase).toEqual({phase: 'failed', reason});
	});

	it('tells a solver that never loaded from other errors', async () => {
		const fake = fakeClient();
		const solving = new Solving(fake.client);
		let done = solving.run(request, () => undefined);
		fake.fail(new SolverUnavailable('offline'));
		await done;
		expect(solving.phase).toEqual({phase: 'failed', reason: 'unavailable'});

		done = solving.run(request, () => undefined);
		fake.fail(new Error('out of memory'));
		await done;
		expect(solving.phase).toEqual({phase: 'failed', reason: 'error', detail: 'out of memory'});
	});

	it('stops the solve when a plan cannot be used, and reports why', async () => {
		const fake = fakeClient();
		const solving = new Solving(fake.client);
		const done = solving.run(request, () => {
			throw new Error('broke a rule');
		});
		fake.improve(false);
		expect(await done).toBe(false);
		expect(solving.phase).toEqual({phase: 'failed', reason: 'error', detail: 'broke a rule'});
	});
});
