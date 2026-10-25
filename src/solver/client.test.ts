// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import {DEFAULT_SETTINGS} from '../domain/settings.ts';
import {
	PlannerClient,
	SolveCancelled,
	SolverUnavailable,
	type SolveHandlers,
} from './client.ts';
import type {SolveRequest, WorkerRequest, WorkerResponse} from './protocol.ts';
import type {SolveOutcome} from './solve.ts';

/**
Stands in for the solver worker, so the client is tested without HiGHS.
*/
class FakeWorker extends EventTarget {
	static spawned: FakeWorker[] = [];
	readonly posted: WorkerRequest[] = [];
	terminated = false;

	constructor() {
		super();
		FakeWorker.spawned.push(this);
	}

	postMessage(message: WorkerRequest): void {
		this.posted.push(message);
	}

	terminate(): void {
		this.terminated = true;
	}

	reply(data: WorkerResponse): void {
		this.dispatchEvent(new MessageEvent('message', {data}));
	}

	failToLoad(): void {
		this.dispatchEvent(new Event('error'));
	}
}

const request: SolveRequest = {
	mapId: 'floating-city',
	start: [],
	played: [],
	settings: DEFAULT_SETTINGS,
};

const outcome: SolveOutcome = {kind: 'timeout', elapsed: 1};
const progress = {elapsed: 1, proven: false};

const handlers = () => ({
	onImprovement: vi.fn<SolveHandlers['onImprovement']>(),
	onProgress: vi.fn<SolveHandlers['onProgress']>(),
});

const lastWorker = () => {
	const worker = FakeWorker.spawned.at(-1);
	if (!worker) {
		throw new Error('No worker was spawned');
	}

	return worker;
};

beforeEach(() => {
	FakeWorker.spawned = [];
	vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('PlannerClient', () => {
	it('spawns the worker only when needed, and once', () => {
		const client = new PlannerClient();
		expect(FakeWorker.spawned).toHaveLength(0);
		client.warmUp();
		client.warmUp();
		client.solve(request, handlers());
		expect(FakeWorker.spawned).toHaveLength(1);
		expect(lastWorker().posted).toEqual([{type: 'solve', ...request}]);
	});

	it('tells listeners when the solver is ready, until they unsubscribe', () => {
		const client = new PlannerClient();
		const kept = vi.fn<() => void>();
		const dropped = vi.fn<() => void>();
		client.onReady(kept);
		const unsubscribe = client.onReady(dropped);
		unsubscribe();
		client.warmUp();
		expect(client.ready).toBe(false);
		lastWorker().reply({type: 'ready'});
		expect(client.ready).toBe(true);
		expect(kept).toHaveBeenCalledOnce();
		expect(dropped).not.toHaveBeenCalled();
	});

	it('passes improvements and progress on, and resolves when done', async () => {
		const client = new PlannerClient();
		const on = handlers();
		const job = client.solve(request, on);
		const worker = lastWorker();
		worker.reply({type: 'improvement', owners: [], progress});
		worker.reply({type: 'progress', progress});
		worker.reply({type: 'done', outcome});
		await expect(job.result).resolves.toEqual(outcome);
		expect(on.onImprovement).toHaveBeenCalledWith([], progress);
		expect(on.onProgress).toHaveBeenCalledWith(progress);
		expect(worker.terminated).toBe(false);
	});

	it('stops listening once the solve is over', async () => {
		const client = new PlannerClient();
		const on = handlers();
		const job = client.solve(request, on);
		const worker = lastWorker();
		worker.reply({type: 'done', outcome});
		await job.result;
		worker.reply({type: 'improvement', owners: [], progress});
		worker.reply({type: 'progress', progress});
		expect(on.onImprovement).not.toHaveBeenCalled();
		expect(on.onProgress).not.toHaveBeenCalled();
	});

	it('keeps the worker after an error it can recover from', async () => {
		const client = new PlannerClient();
		const job = client.solve(request, handlers());
		const worker = lastWorker();
		worker.reply({type: 'ready'});
		worker.reply({type: 'error', message: 'Bad map', fatal: false});
		const error: unknown = await job.result.catch((error: unknown) => error);
		expect(error).toBeInstanceOf(Error);
		expect(error).not.toBeInstanceOf(SolverUnavailable);
		expect((error as Error).message).toBe('Bad map');
		expect(worker.terminated).toBe(false);
		expect(client.ready).toBe(true);
		client.solve(request, handlers());
		expect(FakeWorker.spawned).toHaveLength(1);
	});

	it('replaces the worker after a fatal error', async () => {
		const client = new PlannerClient();
		const job = client.solve(request, handlers());
		const worker = lastWorker();
		worker.reply({type: 'ready'});
		worker.reply({type: 'error', message: 'No connection', fatal: true});
		await expect(job.result).rejects.toBeInstanceOf(SolverUnavailable);
		expect(worker.terminated).toBe(true);
		expect(client.ready).toBe(false);
		client.solve(request, handlers());
		expect(FakeWorker.spawned).toHaveLength(2);
	});

	it('replaces a worker whose script failed to load', async () => {
		const client = new PlannerClient();
		const job = client.solve(request, handlers());
		const worker = lastWorker();
		worker.failToLoad();
		await expect(job.result).rejects.toBeInstanceOf(SolverUnavailable);
		expect(worker.terminated).toBe(true);
		client.solve(request, handlers());
		expect(FakeWorker.spawned).toHaveLength(2);
	});

	it('cancels by terminating the worker, and starts afresh next time', async () => {
		const client = new PlannerClient();
		const on = handlers();
		const job = client.solve(request, on);
		const worker = lastWorker();
		worker.reply({type: 'ready'});
		job.cancel();
		await expect(job.result).rejects.toBeInstanceOf(SolveCancelled);
		expect(worker.terminated).toBe(true);
		expect(client.ready).toBe(false);
		worker.reply({type: 'progress', progress});
		expect(on.onProgress).not.toHaveBeenCalled();
		client.solve(request, handlers());
		expect(FakeWorker.spawned).toHaveLength(2);
	});

	it('cancels a solve still running before starting another', async () => {
		const client = new PlannerClient();
		const first = client.solve(request, handlers());
		const old = lastWorker();
		const on = handlers();
		const second = client.solve(request, on);
		await expect(first.result).rejects.toBeInstanceOf(SolveCancelled);
		expect(old.terminated).toBe(true);
		// The old worker's answer never reaches the new solve.
		old.reply({type: 'done', outcome});
		lastWorker().reply({type: 'progress', progress});
		expect(FakeWorker.spawned).toHaveLength(2);
		expect(on.onProgress).toHaveBeenCalledOnce();
		lastWorker().reply({type: 'done', outcome});
		await expect(second.result).resolves.toEqual(outcome);
	});

	it('keeps the worker when cancelling a solve that has finished', async () => {
		const client = new PlannerClient();
		const job = client.solve(request, handlers());
		const worker = lastWorker();
		worker.reply({type: 'ready'});
		worker.reply({type: 'done', outcome});
		await expect(job.result).resolves.toEqual(outcome);
		job.cancel();
		expect(worker.terminated).toBe(false);
		expect(client.ready).toBe(true);
		client.solve(request, handlers());
		expect(FakeWorker.spawned).toHaveLength(1);
	});
});
