// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import loadHighs from 'highs';
import wasmUrl from 'highs/runtime?url';
import {findMap} from '../maps/index.ts';
import type {WorkerRequest, WorkerResponse} from './protocol.ts';
import {solvePlanningProblem} from './solve.ts';

const post = (message: WorkerResponse) => {
	postMessage(message);
};

// Start downloading and compiling the solver as soon as the worker exists.
// Not awaited: the message listener below must be in place from the start,
// and a failed download is reported to the solve that needed it.
const highs = loadHighs({locateFile: () => wasmUrl});
highs
	.then(() => {
		post({type: 'ready'});
	})
	// eslint-disable-next-line unicorn/prefer-top-level-await -- see above
	.catch(() => {
		// Reported when a solve is requested.
	});

async function handle(data: WorkerRequest): Promise<void> {
	let solver;
	try {
		solver = await highs;
	} catch {
		post({
			type: 'error',
			message: 'The solver could not be downloaded.',
			fatal: true,
		});
		return;
	}

	try {
		const map = findMap(data.mapId);
		if (!map) {
			throw new Error(`Unknown map "${data.mapId}".`);
		}

		const outcome = solvePlanningProblem(
			solver,
			{
				map, start: data.start, played: data.played, ...data.settings,
			},
			{
				hint: data.hint,
				onImprovement(owners, progress) {
					post({type: 'improvement', owners, progress});
				},
				onProgress(progress) {
					post({type: 'progress', progress});
				},
			},
		);
		post({type: 'done', outcome});
	} catch (error) {
		post({
			type: 'error',
			message: error instanceof Error ? error.message : String(error),
			fatal: false,
		});
	}
}

addEventListener('message', ({data}: MessageEvent<WorkerRequest>) => {
	void handle(data);
});
