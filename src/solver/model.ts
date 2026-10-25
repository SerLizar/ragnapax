// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {GameMap, Kingdom} from '../domain/map.ts';
import type {Ownership} from '../domain/plan.ts';
import {
	activeGuilds,
	guildOrders,
	priorities,
	refinements,
	type Criterion,
	type Measure,
	type PlanSettings,
} from '../domain/settings.ts';
import {
	DAYS,
	GUILD_COUNT,
	GUILDS,
	MAX_DECLARATIONS_PER_DAY,
	POINTS,
	VACANT,
	type GuildIndex,
	type KingdomIndex,
} from '../domain/types.ts';
import {MilpBuilder, type Operand, type Term} from './milp.ts';

export type PlanningProblem = {
	readonly map: GameMap;
	readonly start: Ownership;
	/**
	Days already played, as they happened: the position at the end of each,
	from Wednesday on. The plan keeps them and decides the days after.
	*/
	readonly played?: readonly Ownership[];
} & PlanSettings;

/**
Most the tie-breakers (refinements and declarations) can ever contribute to
the objective. Once the solver proves the best plan is within this distance
of optimal, every priority is settled and only tie-breakers could improve.
*/
export const TIE_BREAKER_BUDGET = 0.5;

/**
A whole-number quantity to minimise, varying over a range of `span`.
*/
type Objective = {
	readonly terms: readonly Term[];
	readonly span: number;
};

export type PlanningModel = {
	readonly milp: MilpBuilder;
	/**
	Turns a solver column vector into the owner of every kingdom per day.
	*/
	decode(values: ArrayLike<number>): Ownership[];
	/**
	The reverse, for a week to start the solver from: the value of every
	ownership column, as a partial solution the solver completes itself.
	*/
	encode(owners: readonly Ownership[]): {indices: number[]; values: number[]};
};

/**
Weights that make one unit of each objective outweigh everything after it
combined, plus `below`, keeping the order strict. Also returns the most the
weighted objectives and `below` can add up to.
*/
function strictWeights(objectives: readonly Objective[], below: number) {
	const weights: number[] = [];
	for (let i = objectives.length - 1; i >= 0; i--) {
		weights[i] = below + 1;
		below += weights[i]! * objectives[i]!.span;
	}

	return {weights, most: below};
}

/**
For each guild, the kingdoms it could possibly hold on each day.
A guild only expands into neighbors of what it held the day before, so by
day `d` it can never be more than `d` roads away from its starting towns.
Leaving everything else out of the model makes it far smaller.
*/
function reachable(map: GameMap, known: readonly Ownership[]): boolean[][][] {
	return GUILDS.map(g => {
		const byDay: boolean[][] = known.map(owners => owners.map(owner => owner === g));
		for (let d = known.length; d <= DAYS; d++) {
			const previous = byDay[d - 1]!;
			byDay.push(
				map.kingdoms.map(t => previous[t.index]! || t.neighbors.some(n => previous[n])),
			);
		}

		return byDay;
	});
}

/**
Builds the point sharing model.

Decisions are who owns each kingdom at the end of each day. A guild gains
a kingdom only by declaring on it, which needs a neighbor it held the day
before, at most `MAX_DECLARATIONS_PER_DAY` times a day. Kingdoms that
someone holds never fall back to vacant.

Objectives follow `priorities(settings)` in strict order, then
`refinements(settings)` and the fewest declarations so nobody does needless
work. Days already played are constants: they count towards every total,
so the days left make up for what happened. Guilds sitting out keep what
they hold, untouched, and are left out of every gap and order, so the
others share the rest of the map. See "Formulation" in
docs/SOLVER.md for the whole of it.
*/
export function buildModel({map, start, played = [], ...settings}: PlanningProblem): PlanningModel {
	const milp = new MilpBuilder();
	const active = activeGuilds(settings);
	if (active.length === 0) {
		throw new Error('Every guild sits out: there is nothing to plan.');
	}

	// Positions already decided: the start, then each day played.
	const known = [start, ...played];
	const reach = reachable(map, known);
	// Guilds sitting out keep what they hold now, untouched, for the rest of
	// the week, so those holdings are constants too.
	const latest = known.at(-1)!;
	const isLeftAlone = (g: GuildIndex) => settings.inactive.includes(g);

	// Own[g][d][t]: guild g holds t at the end of day d.
	const own: Operand[][][] = GUILDS.map(g =>
		Array.from({length: DAYS + 1}, (_, d) =>
			map.kingdoms.map((t): Operand => {
				const owners = known[d] ?? (isLeftAlone(g) || isLeftAlone(latest[t.index]!) ? latest : undefined);
				if (owners) {
					return owners[t.index] === g ? 1 : 0;
				}

				return reach[g]![d]![t.index] === true ? milp.binary(`own_g${g}_d${d}_${t.id}`) : 0;
			}),
		),
	);
	const ownAt = (g: GuildIndex, d: number, t: KingdomIndex) => own[g]![d]![t]!;

	const declarations: Term[] = [];

	// Played days were checked by the rules engine; only the rest need rules.
	for (let d = known.length; d <= DAYS; d++) {
		for (const t of map.kingdoms) {
			const holders: Term[] = GUILDS.map(g => [1, ownAt(g, d, t.index)]);
			if (start[t.index] === VACANT) {
				milp.atMost(holders, 1);
				// Once taken, a kingdom never becomes vacant again.
				const before: Term[] = GUILDS.map(g => [-1, ownAt(g, d - 1, t.index)]);
				milp.atLeast([...holders, ...before], 0);
			} else {
				milp.equal(holders, 1);
			}
		}

		for (const g of GUILDS) {
			const declared: Term[] = [];
			for (const t of map.kingdoms) {
				const now = ownAt(g, d, t.index);
				const before = ownAt(g, d - 1, t.index);
				if (now === 0 || before === 1) {
					continue; // Nothing to gain
				}

				// Equals 1 exactly when g gains t today; continuous because the
				// ownership binaries already pin it to 0 or 1.
				const gain = milp.continuous(`gain_g${g}_d${d}_${t.id}`, 0, 1);
				declared.push([1, gain]);
				declarations.push([1, gain]);
				milp.atMost(
					[
						[1, now],
						[-1, before],
						[-1, gain],
					],
					0,
				);
				milp.atMost(
					[
						[1, gain],
						[-1, now],
					],
					0,
				);
				milp.atMost(
					[
						[1, gain],
						[1, before],
					],
					1,
				);
				milp.atMost([[1, gain], ...t.neighbors.map((n): Term => [-1, ownAt(g, d - 1, n)])], 0);
			}

			if (declared.length > MAX_DECLARATIONS_PER_DAY) {
				milp.atMost(declared, MAX_DECLARATIONS_PER_DAY);
			}
		}
	}

	// Each guild's total over the Ragnarok of some per-kingdom, per-day amount.
	const totals = (amount: (t: Kingdom) => number) =>
		GUILDS.map(g => {
			const terms: Term[] = [];
			for (let d = 1; d <= DAYS; d++) {
				for (const t of map.kingdoms) {
					if (amount(t) !== 0) {
						terms.push([amount(t), ownAt(g, d, t.index)]);
					}
				}
			}

			return terms;
		});
	const bound = (amount: (t: Kingdom) => number) =>
		DAYS * map.kingdoms.reduce((sum, t) => sum + amount(t), 0);

	const amountOf = (measure: Measure) =>
		measure === 'points'
			? (t: Kingdom) => POINTS[t.kind]
			: (t: Kingdom) => (t.kind === measure ? 1 : 0);

	// Gap between the best and worst-off guild in a measure, among those
	// that play: the guilds sitting out are not part of the share.
	const gap = (measure: Measure): Objective => {
		const most = milp.continuous(`most_${measure}`, -Infinity, Infinity);
		const least = milp.continuous(`least_${measure}`, -Infinity, Infinity);
		const all = totals(amountOf(measure));
		for (const g of active) {
			const total = all[g]!;
			const negated = total.map(([k, v]): Term => [-k, v]);
			milp.atLeast([[1, most], ...negated], 0);
			milp.atMost([[1, least], ...negated], 0);
		}

		return {
			terms: [
				[1, most],
				[-1, least],
			],
			span: bound(amountOf(measure)),
		};
	};

	// Everyone's points together, negated so that minimising maximises it.
	const total = (): Objective => ({
		terms: totals(amountOf('points')).flatMap(terms => terms.map(([k, v]): Term => [-k, v])),
		span: bound(amountOf('points')),
	});

	// Totals never increase down the list of guilds that play, or never
	// decrease when ascending. Doing nothing all week leaves every guild with
	// the same starting towns, so this never rules out a plan. Once days are
	// played that no longer holds, as a guild may already be out of reach, so
	// extras then go wherever they fit.
	for (const {measure, ascending} of played.length === 0 ? guildOrders(settings) : []) {
		const everyone = totals(amountOf(measure));
		const all = active.map(g => everyone[g]!);
		for (let g = 0; g + 1 < all.length; g++) {
			const [higher, lower] = ascending ? [all[g + 1]!, all[g]!] : [all[g]!, all[g + 1]!];
			milp.atLeast([...higher, ...lower.map(([k, v]): Term => [-k, v])], 0);
		}
	}

	const objective = (c: Criterion) => (c.kind === 'gap' ? gap(c.measure) : total());

	const addCosts = (objectives: readonly Objective[], weights: readonly number[]) => {
		for (const [i, {terms}] of objectives.entries()) {
			for (const [k, v] of terms) {
				milp.addCost(v, k * weights[i]!);
			}
		}
	};

	// Tie-breakers, scaled so that together they stay under TIE_BREAKER_BUDGET.
	const tieBreakers = [
		...refinements(settings).map(c => objective(c)),
		{terms: declarations, span: GUILD_COUNT * DAYS * MAX_DECLARATIONS_PER_DAY},
	];
	const tie = strictWeights(tieBreakers, 0);
	const scale = TIE_BREAKER_BUDGET / (tie.most + 1);
	addCosts(
		tieBreakers,
		tie.weights.map(w => w * scale),
	);

	const ranked = priorities(settings).map(c => objective(c));
	addCosts(ranked, strictWeights(ranked, TIE_BREAKER_BUDGET).weights);

	const decode = (values: ArrayLike<number>): Ownership[] =>
		Array.from({length: DAYS + 1}, (_, d) =>
			map.kingdoms.map(t => {
				const holder = GUILDS.find(g => {
					const v = ownAt(g, d, t.index);
					return (typeof v === 'number' ? v : values[v.col]!) > 0.5;
				});
				return holder ?? VACANT;
			}),
		);

	const encode = (owners: readonly Ownership[]) => {
		const indices: number[] = [];
		const values: number[] = [];
		for (const g of GUILDS) {
			for (let d = known.length; d <= DAYS; d++) {
				for (const t of map.kingdoms) {
					const v = ownAt(g, d, t.index);
					if (typeof v === 'number') {
						continue;
					}

					indices.push(v.col);
					values.push(owners[d]?.[t.index] === g ? 1 : 0);
				}
			}
		}

		return {indices, values};
	};

	return {milp, decode, encode};
}
