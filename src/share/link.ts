// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {GameMap} from '../domain/map.ts';
import {
	cleanGuildName,
	replay,
	setupStatus,
	simulate,
	startingOwnership,
	type DayDeclarations,
	type Plan,
	type StartingTowns,
	type Violation,
} from '../domain/plan.ts';
import {GOALS, type Goal} from '../domain/settings.ts';
import {DAYS, GUILD_COUNT} from '../domain/types.ts';
import {findMap} from '../maps/index.ts';

/**
Everything a share link carries.
*/
export type SharedPlan = {
	readonly map: GameMap;
	readonly guildNames: readonly string[];
	readonly startingTowns: StartingTowns;
	readonly goal: Goal;
	readonly fillMap: boolean;
	readonly castleLast: boolean;
	/**
	Days already played, as they happened, from Wednesday on; the plan
	starts with them. Empty until someone records a day.
	*/
	readonly played: readonly DayDeclarations[];
	readonly plan: Plan | undefined;
	/**
	Sent to someone else: they see it as a shared plan and it is never saved
	over their own. `s=1` in the link.
	*/
	readonly received: boolean;
};

const VERSION = '1';
/**
One character per kingdom index; see `MAX_KINGDOMS`.
*/
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GOAL_CODES: Record<Goal, string> = {points: 'p', resources: 'r'};

/**
Encodes a setup and plan into a URL fragment, e.g.
`v=1&m=floating-city&o=p&g=Alpha&g=Beta…&t=1111222…&p=3k.7.-…`.

- `f=1`: use every kingdom, see `PlanSettings.fillMap`.
- `c=1`: extra castle-days to the last guilds, see `PlanSettings.castleLast`.
- `t`: one digit per town in link order (see `GameMap.linkOrder`): `0`
  vacant, `1`–`4` the guild.
- `h`: days already played, see `SharedPlan.played`, written like `p`.
- `p`: days separated by `-`, guilds by `.`, one character per kingdom,
  by its place in link order. Only the days after those in `h`.
- `s=1`: shared, sent to someone else, see `SharedPlan.received`.
*/
export function encodeShareLink(shared: SharedPlan): string {
	const {map} = shared;
	const encodeDays = (days: readonly DayDeclarations[]) => {
		const place = linkPlaces(map);
		return days
			.map(day =>
				day.map(targets => targets.map(t => ALPHABET[place[t]!]).join('')).join('.'),
			)
			.join('-');
	};

	const parameters = new URLSearchParams({
		v: VERSION,
		m: map.id,
		o: GOAL_CODES[shared.goal],
	});
	if (shared.fillMap) {
		parameters.set('f', '1');
	}

	if (shared.castleLast) {
		parameters.set('c', '1');
	}

	for (const name of shared.guildNames) {
		parameters.append('g', cleanGuildName(name));
	}

	parameters.set(
		't',
		linkTowns(map)
			.map(t => {
				const g = shared.startingTowns[map.kingdoms[t]!.id];
				return g === undefined || g < 0 ? '0' : String(g + 1);
			})
			.join(''),
	);
	if (shared.played.length > 0) {
		parameters.set('h', encodeDays(shared.played));
	}

	if (shared.plan) {
		parameters.set('p', encodeDays(shared.plan.declarations.slice(shared.played.length)));
	}

	if (shared.received) {
		parameters.set('s', '1');
	}

	return parameters.toString();
}

/**
Where each kingdom index comes in `linkOrder`.
*/
function linkPlaces(map: GameMap): number[] {
	const places: number[] = [];
	for (const [place, t] of map.linkOrder.entries()) {
		places[t] = place;
	}

	return places;
}

const linkTowns = (map: GameMap) =>
	map.linkOrder.filter(t => map.kingdoms[t]!.kind === 'town');

/**
Why a link cannot be opened; the interface explains each in words.
*/
export type LinkProblem =
	'damaged' | 'older' | 'newer' | 'map' | 'goal' | 'towns' | 'townRules' | 'plan' | 'rules';

export class ShareLinkError extends Error {
	override name = 'ShareLinkError';

	constructor(
		readonly problem: LinkProblem,
		/**
		For `rules`: the map, and the first rule the plan breaks on it.
		*/
		readonly broken?: {readonly map: GameMap; readonly violation: Violation},
	) {
		super(`Cannot open share link: ${problem}`);
	}
}

/**
Decodes a URL fragment; returns undefined when it is not a share link at all.
*/
export function decodeShareLink(fragment: string): SharedPlan | undefined {
	const parameters = new URLSearchParams(fragment.replace(/^#/u, ''));
	if (!parameters.has('v')) {
		return undefined;
	}

	// A version that is not a number means the link was cut short or mangled,
	// not that it comes from another release.
	const v = parameters.get('v')!;
	if (!/^\d+$/u.test(v)) {
		throw new ShareLinkError('damaged');
	}

	const version = Number(v);
	if (version < Number(VERSION)) {
		throw new ShareLinkError('older');
	}

	if (version !== Number(VERSION)) {
		throw new ShareLinkError('newer');
	}

	const map = findMap(parameters.get('m') ?? undefined);
	if (!map) {
		throw new ShareLinkError('map');
	}

	const goal = GOALS.find(g => GOAL_CODES[g] === parameters.get('o'));
	if (goal === undefined) {
		throw new ShareLinkError('goal');
	}

	// Blank names are shown as "Guild 1" and so on, in the reader's language.
	const names = parameters.getAll('g');
	const guildNames = Array.from({length: GUILD_COUNT}, (_, g) => cleanGuildName(names[g] ?? ''));

	const towns = parameters.get('t') ?? '';
	if (towns.length !== map.towns.length || !/^[0-4]+$/u.test(towns)) {
		throw new ShareLinkError('towns');
	}

	const startingTowns: Record<string, number> = {};
	for (const [i, t] of linkTowns(map).entries()) {
		const g = Number(towns[i]) - 1;
		if (g >= 0) {
			startingTowns[map.kingdoms[t]!.id] = g;
		}
	}

	const decodeDays = (text: string): DayDeclarations[] =>
		text.split('-').map(day =>
			// A kingdom listed twice by hand is still one declare.
			day.split('.').map(targets => [
				...new Set(
					[...targets].map(c => {
						const t = map.linkOrder[ALPHABET.indexOf(c)];
						if (t === undefined) {
							throw new ShareLinkError('plan');
						}

						return t;
					}),
				),
			]),
		);
	const broken = (violation: Violation | undefined) => {
		if (violation) {
			throw new ShareLinkError('rules', {map, violation});
		}
	};

	// A setup can be shared or saved while still being filled in; played days
	// and a plan need every guild's starting towns in place.
	const h = parameters.get('h');
	const p = parameters.get('p');
	if ((h !== null || p !== null) && !setupStatus(map, startingTowns).complete) {
		throw new ShareLinkError('townRules');
	}

	const start = startingOwnership(map, startingTowns);
	let played: DayDeclarations[] = [];
	if (h !== null) {
		played = decodeDays(h);
		// The last day is never recorded: nothing would be left to plan.
		if (played.length >= DAYS) {
			throw new ShareLinkError('plan');
		}

		broken(replay(map, start, played).violations[0]);
	}

	let plan: Plan | undefined;
	if (p !== null) {
		plan = {declarations: [...played, ...decodeDays(p)]};
		broken(simulate(map, start, plan).violations[0]);
	}

	return {
		map,
		guildNames,
		startingTowns,
		goal,
		fillMap: parameters.get('f') === '1',
		castleLast: parameters.get('c') === '1',
		played,
		plan,
		received: parameters.get('s') === '1',
	};
}
