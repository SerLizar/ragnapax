// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {Ownership} from '../domain/plan.ts';
import type {PlanSettings} from '../domain/settings.ts';
import type {SolveOutcome, SolveProgress} from './solve.ts';

/**
Messages from the page to the solver worker.
*/
export type WorkerRequest = {readonly type: 'solve'} & SolveRequest;

/**
What to plan. The worker looks the map up by id rather than receiving it.
*/
export type SolveRequest = {
	readonly mapId: string;
	readonly start: Ownership;
	/**
	Position at the end of each day already played; see `PlanningProblem`.
	*/
	readonly played: readonly Ownership[];
	readonly settings: PlanSettings;
	/**
	A week to start from, such as the plan being made again; see
	`SolveOptions.hint`.
	*/
	readonly hint?: readonly Ownership[];
};

/**
Messages from the solver worker to the page.
*/
export type WorkerResponse =
	| {readonly type: 'ready'}
	| {
		readonly type: 'improvement';
		readonly owners: Ownership[];
		readonly progress: SolveProgress;
	}
	| {readonly type: 'progress'; readonly progress: SolveProgress}
	| {readonly type: 'done'; readonly outcome: SolveOutcome}
	/**
	`fatal` errors leave the worker unusable (the solver did not download);
	the page should replace it. Messages are English, for developers.
	*/
	| {readonly type: 'error'; readonly message: string; readonly fatal: boolean};
