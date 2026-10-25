// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// The rules engine and the model must agree on which weeks are legal. Solver
// tests replay every plan the solver makes through `simulate`, which catches
// a model that allows too much, but not one that forbids a legal week: the
// solver would just never make it. So these tests take random weeks, legal
// and not, pin the model's ownership to them, and check that the model can
// hold exactly the ones the rules engine accepts. Half the weeks have a
// guild sitting out, which the model must leave alone just as
// `disturbances` does.

import loadHighs from 'highs';
import {beforeAll, expect, it} from 'vitest';
import type {GameMap} from '../domain/map.ts';
import {
	followPlan,
	planFromTimeline,
	simulate,
	disturbances,
	startingOwnership,
	type Ownership,
} from '../domain/plan.ts';
import {
	DAYS,
	GUILD_COUNT,
	GUILDS,
	MAX_DECLARATIONS_PER_DAY,
	VACANT,
	type GuildIndex,
} from '../domain/types.ts';
import {MAPS} from '../maps/index.ts';
import {random, randomStart} from '../test/random.ts';
import {buildModel} from './model.ts';

let highs: Awaited<ReturnType<typeof loadHighs>>;
beforeAll(async () => {
	highs = await loadHighs();
});

/**
A random legal week: each day, each guild declares on up to the most it
may of the kingdoms it could, and `followPlan` drops whatever clashes.
Guilds sitting out declare nothing, and nobody declares on what they hold.
*/
function randomWeek(
	map: GameMap,
	start: Ownership,
	inactive: readonly GuildIndex[],
	next: () => number,
): Ownership[] {
	const owners = [start];
	for (let day = 1; day <= DAYS; day++) {
		const before = owners.at(-1)!;
		const declarations = GUILDS.map(g => {
			const options = map.kingdoms
				.filter(t => !inactive.includes(g) && !inactive.includes(before[t.index]!))
				.filter(t => before[t.index] !== g && t.neighbors.some(n => before[n] === g))
				.map(t => t.index)
				.toSorted(() => next() - 0.5);
			return options.slice(0, Math.floor(next() * (MAX_DECLARATIONS_PER_DAY + 1)));
		});
		owners.push(followPlan(map, before, declarations));
	}

	return owners;
}

/**
Whether the rules engine accepts a week: its declarations break no rule
or, after the days played, disturb no guild sitting out, and replaying them
gives back the week itself (a kingdom that falls back to Vacant has no
declaration that could explain it).
*/
function isLegal(
	map: GameMap,
	owners: readonly Ownership[],
	played: number,
	inactive: readonly GuildIndex[],
): boolean {
	const timeline = simulate(map, owners[0]!, planFromTimeline(map, owners));
	return timeline.violations.length === 0
		&& disturbances(timeline, inactive, played + 1).length === 0
		&& timeline.owners.every((day, d) => day.every((owner, t) => owner === owners[d]![t]));
}

/**
Whether the model can hold a week, with every day from `played` on decided
by the model and the days before it given as played.
*/
function canModelHold(
	map: GameMap,
	owners: readonly Ownership[],
	played: number,
	inactive: readonly GuildIndex[],
): boolean {
	const {milp} = buildModel({
		map, start: owners[0]!, played: owners.slice(1, played + 1), goal: 'points', fillMap: false, castleLast: false, inactive,
	});
	const column = new Map(milp.names.map((name, col) => [name, col]));
	const data = milp.toArrays();
	const decided = Array.from({length: DAYS - played}, (_, i) => played + 1 + i).flatMap(d =>
		map.kingdoms.flatMap(t => GUILDS.map(g => ({
			col: column.get(`own_g${g}_d${d}_${t.id}`),
			doesHold: owners[d]![t.index] === g,
			// Guilds sitting out keep what they held when the days played ended.
			isFixed: inactive.includes(g) && owners[played]![t.index] === g,
		}))));
	for (const {col, doesHold, isFixed} of decided) {
		// Left out of the model as out of reach, it can only be 0, or as
		// held by a guild sitting out, only 1.
		if (col === undefined) {
			if (doesHold !== isFixed) {
				return false;
			}

			continue;
		}

		data.colLower[col] = doesHold ? 1 : 0;
		data.colUpper[col] = doesHold ? 1 : 0;
	}

	const finite = (a: Float64Array) =>
		a.map(v => (Math.abs(v) === Infinity ? Math.sign(v) * highs.infinity : v));
	return highs.withModel(
		{
			...data,
			colLower: finite(data.colLower),
			colUpper: finite(data.colUpper),
			rowLower: finite(data.rowLower),
			rowUpper: finite(data.rowUpper),
		},
		model => {
			model.options.set({output_flag: false});
			const {modelStatus: status} = model.run();
			const {modelStatus} = highs.constants;
			if (status === modelStatus.optimal) {
				return true;
			}

			expect([modelStatus.infeasible, modelStatus.unboundedOrInfeasible]).toContain(status);
			return false;
		},
	);
}

/**
A copy of a week with one kingdom given to someone else (or nobody) on one
day after those played, which the rules may or may not allow.
*/
function mutate(owners: readonly Ownership[], played: number, next: () => number): Ownership[] {
	const day = played + 1 + Math.floor(next() * (DAYS - played));
	const t = Math.floor(next() * owners[0]!.length);
	const choices = [VACANT, ...GUILDS].filter(owner => owner !== owners[day]![t]);
	const mutated = owners.map(o => [...o]);
	mutated[day]![t] = choices[Math.floor(next() * choices.length)]!;
	return mutated;
}

const WEEKS = 40;
const MUTATIONS = 4;

it.each(MAPS.map(map => [map.id, map] as const))(
	'allows exactly the weeks the rules engine allows on %s',
	(_, map) => {
		let legal = 0;
		let illegal = 0;
		for (let seed = 1; seed <= WEEKS; seed++) {
			const next = random(seed);
			// Every guild in turn sits out, in half the weeks.
			const inactive = seed % 2 === 0 ? [] : [Math.floor(seed / 2) % GUILD_COUNT];
			const owners = randomWeek(map, startingOwnership(map, randomStart(map, seed)), inactive, next);
			// Some days already played, as when planning the rest of the week.
			const played = seed % 3;
			expect(isLegal(map, owners, played, inactive)).toBe(true);
			expect(canModelHold(map, owners, played, inactive), `legal week, seed ${seed}`).toBe(true);
			legal++;

			for (let i = 0; i < MUTATIONS; i++) {
				const mutated = mutate(owners, played, next);
				const isAllowed = isLegal(map, mutated, played, inactive);
				expect(canModelHold(map, mutated, played, inactive), `seed ${seed}, change ${i}`).toBe(isAllowed);
				if (isAllowed) {
					legal++;
				} else {
					illegal++;
				}
			}
		}

		// Both kinds were checked, or the test would pass on nothing.
		expect(legal).toBeGreaterThan(WEEKS);
		expect(illegal).toBeGreaterThan(WEEKS);
	},
);
