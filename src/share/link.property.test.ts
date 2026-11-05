// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// What must hold for every share link, whatever is in it, where
// `share.test.ts` has worked examples. Each run tries new cases; a failure
// prints the smallest one found and the seed to run it again.

import fc from 'fast-check';
import {describe, expect, it} from 'vitest';
import type {GameMap} from '../domain/map.ts';
import {
	cleanGuildName,
	continuePlan,
	planFromTimeline,
	setupStatus,
	simulate,
	startingOwnership,
	type StartingTowns,
} from '../domain/plan.ts';
import {GOALS} from '../domain/settings.ts';
import {
	DAYS,
	GUILD_COUNT,
	GUILDS,
	KINGDOM_KINDS,
	MAX_DECLARATIONS_PER_DAY,
	perKind,
	TOWNS_PER_GUILD,
} from '../domain/types.ts';
import {MAPS} from '../maps/index.ts';
import {
	decodeShareLink,
	encodeShareLink,
	ShareLinkError,
	type SharedPlan,
} from './link.ts';

/**
Text a player could paste as a name: anything, in graphemes or code points.
*/
const anyText = fc.oneof(fc.string({unit: 'grapheme'}), fc.string({unit: 'binary'}));

/**
Starting towns dealt in turn to the guilds. Mostly a full deal, as plans need
one; otherwise a setup still being filled in.
*/
const startingTownsOn = (map: GameMap): fc.Arbitrary<StartingTowns> => {
	const ids = map.towns.map(t => map.kingdoms[t]!.id);
	const full = GUILD_COUNT * TOWNS_PER_GUILD;
	return fc
		.oneof(
			{arbitrary: fc.shuffledSubarray(ids, {minLength: full, maxLength: full}), weight: 4},
			{arbitrary: fc.shuffledSubarray(ids, {maxLength: full - 1}), weight: 1},
		)
		.map(dealt => Object.fromEntries(dealt.map((id, i) => [id, i % GUILD_COUNT])));
};

/**
A legal week: random declarations, as far as the rules allow them.
*/
const legalPlanOn = (map: GameMap, start: StartingTowns) => {
	const targets = fc.array(fc.nat(map.kingdoms.length - 1), {maxLength: MAX_DECLARATIONS_PER_DAY});
	const day = fc.array(targets, {minLength: GUILD_COUNT, maxLength: GUILD_COUNT});
	return fc.array(day, {minLength: DAYS, maxLength: DAYS}).map(declarations =>
		planFromTimeline(continuePlan(map, [startingOwnership(map, start)], {declarations})),
	);
};

const targetsOn = (map: GameMap) => {
	const held = fc
		.tuple(...KINGDOM_KINDS.map(kind => fc.nat(map.mostHeld[kind])))
		.map(days => perKind((_, i) => days[i]!));
	return fc.array(held, {minLength: GUILD_COUNT, maxLength: GUILD_COUNT});
};

/**
Anything the planner may share, on any map.
*/
const sharedPlan: fc.Arbitrary<SharedPlan> = fc
	.constantFrom(...MAPS)
	.chain(map =>
		startingTownsOn(map).chain(startingTowns => {
			// Played days and a plan need every guild's towns in place.
			const week = setupStatus(map, startingTowns).complete
				? fc.tuple(legalPlanOn(map, startingTowns), fc.nat(DAYS - 1), fc.boolean())
				: fc.constant(undefined);
			return fc.record({
				map: fc.constant(map),
				startingTowns: fc.constant(startingTowns),
				week,
				names: fc.array(anyText, {minLength: GUILD_COUNT, maxLength: GUILD_COUNT}),
				goal: fc.constantFrom(...GOALS),
				fillMap: fc.boolean(),
				castleLast: fc.boolean(),
				inactive: fc.subarray([...GUILDS], {maxLength: GUILD_COUNT - 1}),
				fewestDays: fc.boolean(),
				targets: fc.option(targetsOn(map), {nil: undefined}),
				received: fc.boolean(),
			});
		}),
	)
	.map(({week, names, ...rest}) => {
		const [plan, daysPlayed = 0, hasPlan] = week ?? [];
		return {
			...rest,
			guildNames: names.map(name => cleanGuildName(name)),
			played: plan?.declarations.slice(0, daysPlayed) ?? [],
			plan: hasPlan ? plan : undefined,
		};
	});

/**
An edit to a link: where, how many characters to delete, and what to type.
The link's own punctuation gets further than other text before being refused.
*/
const typed = fc.oneof(
	fc.string({maxLength: 3}),
	fc.string({unit: fc.constantFrom('-', '.', '&', '=', '1'), maxLength: 3}),
);
const edit = fc.tuple(fc.nat(), fc.nat(3), typed);

/**
A link after a mangling.
*/
const damagedLink = fc
	.tuple(sharedPlan, fc.array(edit, {minLength: 1, maxLength: 4}))
	.map(([shared, edits]) => {
		let link = encodeShareLink(shared);
		for (const [at, deleted, text] of edits) {
			const place = at % (link.length + 1);
			link = link.slice(0, place) + text + link.slice(place + deleted);
		}

		return link;
	});

/**
What a link opens to; undefined when it does not, in a way players are told.
Any other failure is a bug, and fails the test.
*/
function open(fragment: string): SharedPlan | undefined {
	try {
		return decodeShareLink(fragment);
	} catch (error) {
		if (error instanceof ShareLinkError) {
			return undefined;
		}

		throw error;
	}
}

const expectSafeToOpen = (fragment: string) => {
	const opened = open(fragment);
	if (!opened) {
		return;
	}

	// The last day is never recorded: nothing would be left to plan.
	expect(opened.played.length).toBeLessThan(DAYS);
	if (opened.plan) {
		const {map, plan, startingTowns} = opened;
		expect(simulate(map, startingOwnership(map, startingTowns), plan).violations).toEqual([]);
		expect(plan.declarations.length).toBeLessThanOrEqual(DAYS);
		expect(plan.declarations.every(day => day.length <= GUILD_COUNT)).toBe(true);
	}

	// What opened can be saved or passed on, and comes back the same.
	expect(decodeShareLink(encodeShareLink(opened))).toEqual(opened);
};

describe('share links, whatever is in them', () => {
	it('bring back everything the planner shares', () => {
		fc.assert(
			fc.property(sharedPlan, shared => {
				expect(decodeShareLink(encodeShareLink(shared))).toEqual(shared);
			}),
		);
	});

	it('open safely or say why not, after being mangled', () => {
		fc.assert(fc.property(damagedLink, expectSafeToOpen));
	});

	it('open safely or say why not, from any text at all', () => {
		fc.assert(
			fc.property(anyText, text => {
				expectSafeToOpen(text);
				expectSafeToOpen(`v=1&${text}`);
			}),
		);
	});
});

describe('guild names, whatever is typed', () => {
	const characters = new Intl.Segmenter('en', {granularity: 'grapheme'});

	it('stay within the game\'s 9 characters, and clean', () => {
		fc.assert(
			fc.property(anyText, name => {
				const clean = cleanGuildName(name);
				expect([...characters.segment(clean)].length).toBeLessThanOrEqual(9);
				expect(cleanGuildName(clean)).toBe(clean);
			}),
		);
	});
});
