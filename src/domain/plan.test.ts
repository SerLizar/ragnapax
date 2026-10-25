// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {DEFAULT_MAP as map} from '../maps/index.ts';
import {FLOATING_CITY_START} from '../test/fixtures.ts';
import {
	capturesOn,
	continuePlan,
	dayBetween,
	followPlan,
	planFromTimeline,
	replay,
	score,
	setupStatus,
	simulate,
	startingOwnership,
	type Plan,
} from './plan.ts';
import {VACANT} from './types.ts';

const idx = (id: string) => map.indexOf(id)!;
const start = startingOwnership(map, FLOATING_CITY_START);
const idle = (): number[][] => [[], [], [], []];
const planWith = (day1: number[][]): Plan => ({
	declarations: [day1, idle(), idle(), idle(), idle(), idle()],
});

describe('setupStatus', () => {
	it('counts towns and leaves the rest vacant', () => {
		const status = setupStatus(map, FLOATING_CITY_START);
		expect(status.counts).toEqual([4, 4, 4, 4]);
		expect(status.vacant).toEqual([idx('Q')]);
		expect(status.complete).toBe(true);
	});

	it('is incomplete while a guild is missing towns', () => {
		const rest = {...FLOATING_CITY_START};
		delete rest.A;
		const status = setupStatus(map, rest);
		expect(status.counts[0]).toBe(3);
		expect(status.complete).toBe(false);
	});
});

describe('simulate', () => {
	it('accepts an idle plan and keeps the starting position', () => {
		const timeline = simulate(map, start, planWith(idle()));
		expect(timeline.violations).toEqual([]);
		expect(timeline.owners[6]).toEqual(start);
		expect(timeline.owners[6]![idx('Darkwick')]).toBe(VACANT);
	});

	it('applies legal declarations', () => {
		const day1 = idle();
		day1[0] = [idx('Vagastrom'), idx('Dionysia')];
		const timeline = simulate(map, start, planWith(day1));
		expect(timeline.violations).toEqual([]);
		expect(timeline.owners[1]![idx('Vagastrom')]).toBe(0);
		expect(capturesOn(timeline, 1)).toEqual([
			{kingdom: idx('Vagastrom'), guild: 0, from: VACANT},
			{kingdom: idx('Dionysia'), guild: 0, from: VACANT},
		]);
	});

	it('rejects declarations that break the rules', () => {
		const day1 = idle();
		day1[0] = [idx('Darkwick'), idx('A'), idx('Vagastrom'), idx('Dionysia')];
		day1[1] = [idx('Vagastrom')];
		const {violations} = simulate(map, start, planWith(day1));
		expect(violations).toEqual([
			{
				rule: 'limit', day: 1, guild: 0, count: 4,
			},
			{
				rule: 'adjacent', day: 1, guild: 0, kingdom: idx('Darkwick'),
			},
			{
				rule: 'held', day: 1, guild: 0, kingdom: idx('A'),
			},
			{
				rule: 'contested', day: 1, guild: 1, rival: 0, kingdom: idx('Vagastrom'),
			},
		]);
	});

	it('rejects a guild declaring on a kingdom twice in a day', () => {
		const day1 = idle();
		day1[0] = [idx('Vagastrom'), idx('Vagastrom')];
		expect(simulate(map, start, planWith(day1)).violations).toEqual([
			{
				rule: 'twice', day: 1, guild: 0, kingdom: idx('Vagastrom'),
			},
		]);
	});

	it('round-trips through planFromTimeline', () => {
		const day1 = idle();
		day1[2] = [idx('Hotarubi'), idx('Jabberwock')];
		const plan = planWith(day1);
		const timeline = simulate(map, start, plan);
		expect(planFromTimeline(map, timeline.owners)).toEqual(plan);
	});
});

describe('replay', () => {
	it('replays some days from any position, numbering them from the first', () => {
		const day1 = idle();
		day1[0] = [idx('Vagastrom')];
		const day2 = idle();
		day2[0] = [idx('Darkwick')];
		const {owners, violations} = replay(map, start, [day1, day2]);
		expect(violations).toEqual([]);
		expect(owners).toHaveLength(3);
		expect(owners[2]![idx('Darkwick')]).toBe(0);

		expect(replay(map, start, [day2], 3).violations).toEqual([
			{
				rule: 'adjacent', day: 3, guild: 0, kingdom: idx('Darkwick'),
			},
		]);
	});
});

describe('followPlan', () => {
	it('applies the declarations the rules still allow and leaves out the rest', () => {
		const planned = idle();
		// Guild 1 never got Vagastrom, so cannot move on to the castle from it.
		planned[0] = [idx('Darkwick'), idx('Dionysia')];
		planned[2] = [idx('Hotarubi')];
		const after = followPlan(map, start, planned);
		expect(after[idx('Darkwick')]).toBe(VACANT);
		expect(after[idx('Dionysia')]).toBe(0);
		expect(after[idx('Hotarubi')]).toBe(2);
	});

	it('gives a kingdom to the first guild planned on it', () => {
		const planned = idle();
		planned[0] = [idx('Vagastrom')];
		planned[1] = [idx('Vagastrom')];
		expect(followPlan(map, start, planned)[idx('Vagastrom')]).toBe(0);
	});
});

describe('continuePlan', () => {
	it('keeps the days played and carries the plan on as far as it still can', () => {
		// Planned: guild 1 takes Vagastrom on Wednesday, then the castle from it.
		const planned: Plan = {
			declarations: [[[idx('Vagastrom')], [], [], []], [[idx('Darkwick')], [], [], []], idle(), idle(), idle(), idle()],
		};
		// Played: guild 2 took Vagastrom instead.
		const wednesday = [...start];
		wednesday[idx('Vagastrom')] = 1;
		const owners = continuePlan(map, [start, wednesday], planned);
		expect(owners).toHaveLength(7);
		expect(owners[1]).toEqual(wednesday);
		// Without Vagastrom, guild 1 cannot reach the castle on Thursday.
		expect(owners[2]![idx('Darkwick')]).toBe(VACANT);
		const {violations} = simulate(map, start, planFromTimeline(map, owners));
		expect(violations).toEqual([]);
	});
});

describe('dayBetween', () => {
	it('works out the declarations that lead from one position to the next', () => {
		const after = [...start];
		after[idx('Vagastrom')] = 1;
		after[idx('B')] = 1;
		const {declarations, violations} = dayBetween(map, start, after, 2);
		expect(declarations).toEqual([[], [idx('B'), idx('Vagastrom')], [], []]);
		expect(violations).toEqual([]);
	});

	it('reports a position the rules cannot reach', () => {
		const after = [...start];
		after[idx('Darkwick')] = 3;
		expect(dayBetween(map, start, after, 4).violations).toEqual([
			{
				rule: 'adjacent', day: 4, guild: 3, kingdom: idx('Darkwick'),
			},
		]);
	});
});

describe('score', () => {
	it('credits every held kingdom on every scored day', () => {
		const day1 = idle();
		day1[0] = [idx('Vagastrom')];
		const scores = score(map, simulate(map, start, planWith(day1)));
		expect(scores[0]).toEqual({
			points: 6 * (4 + 2),
			pointsByDay: [6, 6, 6, 6, 6, 6],
			held: {town: 24, dormitory: 6, castle: 0},
			declarations: 1,
		});
		expect(scores[1]!.points).toBe(24);
	});
});
