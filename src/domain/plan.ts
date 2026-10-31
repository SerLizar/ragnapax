// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {GameMap} from './map.ts';
import {
	GUILD_COUNT,
	DAYS,
	GUILDS,
	MAX_DECLARATIONS_PER_DAY,
	POINTS,
	KINGDOM_KINDS,
	TOWNS_PER_GUILD,
	VACANT,
	type GuildIndex,
	type KingdomIndex,
	type KingdomKind,
} from './types.ts';

/**
Owner of every kingdom (by index) at one point in time.
*/
export type Ownership = readonly GuildIndex[];

/**
Which guild starts on each town, by town id. Unlisted towns start vacant.
*/
export type StartingTowns = Readonly<Record<string, GuildIndex>>;

/**
One day's declarations: `day[guild]` lists the kingdoms a guild declares on.
*/
export type DayDeclarations = ReadonlyArray<readonly KingdomIndex[]>;

/**
A point sharing plan: the declarations every guild makes on every day.
`declarations[day - 1][guild]` lists the kingdoms declared on that day.
*/
export type Plan = {
	readonly declarations: readonly DayDeclarations[];
};

export type SetupStatus = {
	/**
	Starting towns per guild.
	*/
	readonly counts: readonly number[];
	/**
	Towns that will start vacant given the current assignment.
	*/
	readonly vacant: readonly KingdomIndex[];
	readonly complete: boolean;
};

/**
Longest guild name the game allows, in characters as players see them: an
emoji or a kanji counts as one, however many bytes or code units it takes.
*/
export const GUILD_NAME_MAX_LENGTH = 9;

const characters = new Intl.Segmenter('en', {granularity: 'grapheme'});

/**
Control characters and the invisible marks that reverse or isolate the
direction of text. Names come in links from strangers, and these could
break a line or make a name read as something else. Joiners stay: emoji
are built with them.
*/
const HIDDEN = /[\p{Control}\u{061C}\u{200E}\u{200F}\u{202A}-\u{202E}\u{2066}-\u{2069}]/gu;

/**
A guild name cut to `GUILD_NAME_MAX_LENGTH` characters, without hidden
ones. Spaces stay, so it can be used while the name is being typed.
*/
export function cutGuildName(name: string): string {
	let cut = '';
	let count = 0;
	for (const {segment} of characters.segment(name.replaceAll(HIDDEN, ''))) {
		if (count === GUILD_NAME_MAX_LENGTH) {
			break;
		}

		cut += segment;
		count++;
	}

	return cut;
}

/**
A guild name as stored and shared: without surrounding spaces (phone
keyboards add one after a suggested word), and no longer than the limit.
Blank means "Guild N" in the reader's language.
*/
export const cleanGuildName = (name: string): string =>
	cutGuildName(name.replaceAll(HIDDEN, '').trim()).trimEnd();

export function setupStatus(map: GameMap, start: StartingTowns): SetupStatus {
	const counts = GUILDS.map(() => 0);
	const vacant: KingdomIndex[] = [];
	for (const t of map.towns) {
		const g = start[map.kingdoms[t]!.id];
		if (g === undefined || g === VACANT) {
			vacant.push(t);
		} else {
			counts[g]!++;
		}
	}

	return {
		counts,
		vacant,
		complete: counts.every(n => n === TOWNS_PER_GUILD),
	};
}

export function startingOwnership(map: GameMap, start: StartingTowns): Ownership {
	return map.kingdoms.map(t => (t.kind === 'town' ? (start[t.id] ?? VACANT) : VACANT));
}

/**
A broken rule, as data: the interface puts it into words in the player's
language (`describeViolation` in `src/i18n/describe.ts`).
*/
export type Violation =
	/**
	The plan does not cover every day of the Ragnarok.
	*/
	| {readonly rule: 'days'; readonly days: number}
	/**
	A day lists declarations for more guilds than there are.
	*/
	| {readonly rule: 'guilds'; readonly day: number}
	| {
		readonly rule: 'limit';
		readonly day: number;
		readonly guild: GuildIndex;
		readonly count: number;
	}
	| {readonly rule: 'unknown'; readonly day: number; readonly guild: GuildIndex}
	/**
	`held`: on a kingdom the guild holds already; `adjacent`: on one next
	to nothing it held the day before; `twice`: on the same kingdom twice
	in one day.
	*/
	| {
		readonly rule: 'held' | 'adjacent' | 'twice';
		readonly day: number;
		readonly guild: GuildIndex;
		readonly kingdom: KingdomIndex;
	}
	| {
		readonly rule: 'contested';
		readonly day: number;
		readonly guild: GuildIndex;
		readonly rival: GuildIndex;
		readonly kingdom: KingdomIndex;
	};

/**
A declaration that does not leave a guild sitting out alone: `declares`, a
guild sitting out declares; `attacks`, a guild declares on a kingdom held
by `rival`, who sits out. Not against the game's rules, only unkind, and a
guild sitting out may well defend; the interface warns about it in words
(`describeDisturbance` in `src/i18n/describe.ts`).
*/
export type Disturbance =
	| {
		readonly kind: 'declares';
		readonly day: number;
		readonly guild: GuildIndex;
		readonly kingdom: KingdomIndex;
	}
	| {
		readonly kind: 'attacks';
		readonly day: number;
		readonly guild: GuildIndex;
		readonly rival: GuildIndex;
		readonly kingdom: KingdomIndex;
	};

export type Timeline = {
	/**
	`owners[day]` for days `0 .. DAYS`.
	*/
	readonly owners: readonly Ownership[];
	/**
	Rule violations found while replaying the plan; empty when legal.
	*/
	readonly violations: readonly Violation[];
};

/**
Replays a plan from the starting position, checking every rule.
*/
export function simulate(map: GameMap, start: Ownership, plan: Plan): Timeline {
	const days = Array.from({length: DAYS}, (_, d) => plan.declarations[d] ?? []);
	const {owners, violations} = replay(map, start, days);
	return {
		owners,
		violations:
			plan.declarations.length === DAYS
				? violations
				: [{rule: 'days', days: plan.declarations.length}, ...violations],
	};
}

/**
Replays some days of declarations, checking every rule. `start` is the
position before `firstDay`, and `owners[0]` in the result.
*/
export function replay(
	map: GameMap,
	start: Ownership,
	days: readonly DayDeclarations[],
	firstDay = 1,
): Timeline {
	const violations: Violation[] = [];
	const owners: Ownership[] = [start];

	for (const [i, today] of days.entries()) {
		const day = firstDay + i;
		const before = owners[i]!;
		const after = [...before];
		const claimedBy = new Map<KingdomIndex, GuildIndex>();
		if (today.length > GUILD_COUNT) {
			violations.push({rule: 'guilds', day});
		}

		for (const guild of GUILDS) {
			const targets = today[guild] ?? [];
			if (targets.length > MAX_DECLARATIONS_PER_DAY) {
				violations.push({
					rule: 'limit', day, guild, count: targets.length,
				});
			}

			for (const kingdom of targets) {
				const t = map.kingdoms[kingdom];
				if (!t) {
					violations.push({rule: 'unknown', day, guild});
					continue;
				}

				if (before[kingdom] === guild) {
					violations.push({
						rule: 'held', day, guild, kingdom,
					});
				}

				if (t.neighbors.every(n => before[n] !== guild)) {
					violations.push({
						rule: 'adjacent', day, guild, kingdom,
					});
				}

				const rival = claimedBy.get(kingdom);
				if (rival === guild) {
					violations.push({
						rule: 'twice', day, guild, kingdom,
					});
				} else if (rival !== undefined) {
					violations.push({
						rule: 'contested', day, guild, rival, kingdom,
					});
				}

				claimedBy.set(kingdom, guild);
				after[kingdom] = guild;
			}
		}

		owners.push(after);
	}

	return {owners, violations};
}

/**
Day-on-day difference: which guild took which kingdom, and from whom.
*/
export type Capture = {
	readonly kingdom: KingdomIndex;
	readonly guild: GuildIndex;
	readonly from: GuildIndex;
};

export function capturesOn(timeline: Timeline, day: number): Capture[] {
	const before = timeline.owners[day - 1];
	const after = timeline.owners[day];
	if (!before || !after) {
		return [];
	}

	const captures: Capture[] = [];
	for (const [kingdom, guild] of after.entries()) {
		if (guild !== VACANT && guild !== before[kingdom]) {
			captures.push({kingdom, guild, from: before[kingdom]!});
		}
	}

	return captures;
}

/**
The guilds a day's declarations are listed for, in order: those that play,
and those sitting out only on a day they declared, which can be one played
before they sat out. Otherwise they would read "no declares" every day.
*/
export function guildsListed(captures: readonly Capture[], inactive: readonly GuildIndex[]): GuildIndex[] {
	return GUILDS.filter(g => !inactive.includes(g) || captures.some(c => c.guild === g));
}

/**
Declarations of a legal timeline that disturb the guilds sitting out, from
`firstDay` on: they make none, and nobody declares on what they hold. Days
before `firstDay` were played already, and happened however they did.
*/
export function disturbances(
	timeline: Timeline,
	inactive: readonly GuildIndex[],
	firstDay = 1,
): Disturbance[] {
	const found: Disturbance[] = [];
	for (let day = firstDay; day < timeline.owners.length; day++) {
		for (const {kingdom, guild, from} of capturesOn(timeline, day)) {
			if (inactive.includes(guild)) {
				found.push({
					kind: 'declares', day, guild, kingdom,
				});
			} else if (inactive.includes(from)) {
				found.push({
					kind: 'attacks', day, guild, rival: from, kingdom,
				});
			}
		}
	}

	return found;
}

export type GuildScore = {
	readonly points: number;
	/**
	Points earned on each scored day; index 0 is day 1.
	*/
	readonly pointsByDay: readonly number[];
	/**
	Kingdom-days held per kingdom kind.
	*/
	readonly held: Readonly<Record<KingdomKind, number>>;
	readonly declarations: number;
};

export function score(map: GameMap, timeline: Timeline): GuildScore[] {
	return GUILDS.map(g => {
		const held = Object.fromEntries(KINGDOM_KINDS.map(k => [k, 0])) as Record<
			KingdomKind,
			number
		>;
		const pointsByDay: number[] = [];
		let declarations = 0;
		for (let day = 1; day < timeline.owners.length; day++) {
			const before = timeline.owners[day - 1]!;
			let points = 0;
			for (const [t, owner] of timeline.owners[day]!.entries()) {
				if (owner !== g) {
					continue;
				}

				const {kind} = map.kingdoms[t]!;
				held[kind]++;
				points += POINTS[kind];
				// Taken today, as `capturesOn` counts it.
				if (before[t] !== g) {
					declarations++;
				}
			}

			pointsByDay.push(points);
		}

		return {
			points: pointsByDay.reduce((a, b) => a + b, 0),
			pointsByDay,
			held,
			declarations,
		};
	});
}

/**
The position after one day of `planned` declarations from `before`,
leaving out any that the rules no longer allow, such as declares from a
kingdom the guild did not get after all.
*/
export function followPlan(map: GameMap, before: Ownership, planned: DayDeclarations): Ownership {
	const after = [...before];
	const claimed = new Set<KingdomIndex>();
	for (const guild of GUILDS) {
		let count = 0;
		for (const kingdom of planned[guild] ?? []) {
			const t = map.kingdoms[kingdom];
			if (
				!t
				|| count === MAX_DECLARATIONS_PER_DAY
				|| claimed.has(kingdom)
				|| before[kingdom] === guild
				|| t.neighbors.every(n => before[n] !== guild)
			) {
				continue;
			}

			claimed.add(kingdom);
			after[kingdom] = guild;
			count++;
		}
	}

	return after;
}

/**
The week from the positions already known (the start, then the end of
each day played), carried on with a plan's declarations for the days
after, as far as the rules still allow. Always legal, and close to the
plan: a good week to start planning again from.
*/
export function continuePlan(map: GameMap, known: readonly Ownership[], plan: Plan): Ownership[] {
	const owners = [...known];
	for (let day = known.length; day <= DAYS; day++) {
		owners.push(followPlan(map, owners.at(-1)!, plan.declarations[day - 1] ?? []));
	}

	return owners;
}

/**
The declarations that turn `before` into `after` on scored day `day`, and
any rules they break.
*/
export function dayBetween(
	map: GameMap,
	before: Ownership,
	after: Ownership,
	day: number,
): {readonly declarations: DayDeclarations; readonly violations: readonly Violation[]} {
	const declarations = planFromTimeline([before, after]).declarations[0] ?? [];
	return {declarations, violations: replay(map, before, [declarations], day).violations};
}

/**
Builds a plan from a timeline by diffing consecutive days.
*/
export function planFromTimeline(owners: readonly Ownership[]): Plan {
	const declarations: KingdomIndex[][][] = [];
	for (let day = 1; day < owners.length; day++) {
		const today: KingdomIndex[][] = GUILDS.map(() => []);
		for (const [t, g] of owners[day]!.entries()) {
			if (g !== VACANT && g !== owners[day - 1]![t]) {
				today[g]!.push(t);
			}
		}

		declarations.push(today);
	}

	return {declarations};
}
