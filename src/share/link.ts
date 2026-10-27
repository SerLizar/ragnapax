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
import {
	DAYS,
	GUILD_COUNT,
	KINGDOM_KINDS,
	type GuildIndex,
	type Holdings,
} from '../domain/types.ts';
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
	Guilds sitting out, in guild order; see `PlanSettings.inactive`.
	*/
	readonly inactive: readonly GuildIndex[];
	readonly fewestDays: boolean;
	/**
	Holdings set by hand; see `PlanSettings.targets`. The goal and the
	switches it replaces are kept as they were, for when it is turned off.
	*/
	readonly targets?: readonly Holdings[];
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
- `i`: the guilds sitting out, one digit `1`–`4` each, in guild order; see
  `PlanSettings.inactive`. Absent when every guild plays.
- `d=1`: declare on the fewest days, see `PlanSettings.fewestDays`.
- `k`: holdings set by hand, see `PlanSettings.targets`: town-, dorm- and
  castle-days separated by `.`, guilds by `-`, e.g. `25.10.1-25.10.1-…`.
  Absent when sharing by the goal.
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

	if (shared.inactive.length > 0) {
		parameters.set('i', shared.inactive.map(g => g + 1).join(''));
	}

	if (shared.fewestDays) {
		parameters.set('d', '1');
	}

	if (shared.targets) {
		parameters.set(
			'k',
			shared.targets.map(held => KINGDOM_KINDS.map(kind => held[kind]).join('.')).join('-'),
		);
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
The guilds sitting out, from `i`. Links from before guilds could sit out
have every guild playing. At least one always plays, or there would be
nothing to plan.
*/
function decodeInactive(text: string): GuildIndex[] {
	if (!/^[1-4]*$/u.test(text)) {
		throw new ShareLinkError('damaged');
	}

	const inactive = [...new Set(text)].toSorted().map(digit => Number(digit) - 1);
	if (inactive.length === GUILD_COUNT) {
		throw new ShareLinkError('damaged');
	}

	return inactive;
}

/**
Holdings set by hand, from `k`: whole numbers of days, each no more than
one guild could hold on the map. Links from before they could be set share
by the goal.
*/
function decodeTargets(map: GameMap, parameters: URLSearchParams): Holdings[] | undefined {
	const text = parameters.get('k');
	if (text === null) {
		return undefined;
	}

	const guilds = text.split('-');
	if (guilds.length !== GUILD_COUNT) {
		throw new ShareLinkError('damaged');
	}

	return guilds.map(guild => {
		const days = guild.split('.');
		if (days.length !== KINGDOM_KINDS.length || days.some(d => !/^\d{1,3}$/u.test(d))) {
			throw new ShareLinkError('damaged');
		}

		const held = Object.fromEntries(KINGDOM_KINDS.map((kind, i) => [kind, Number(days[i])])) as Holdings;
		if (KINGDOM_KINDS.some(kind => held[kind] > map.mostHeld[kind])) {
			throw new ShareLinkError('damaged');
		}

		return held;
	});
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

	const inactive = decodeInactive(parameters.get('i') ?? '');
	const byHand = decodeTargets(map, parameters);
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
		// Declares on a guild sitting out break no rule: the plan opens, with
		// a warning (see `PlannerState.disturbance`).
		broken(simulate(map, start, plan).violations[0]);
	}

	return {
		map,
		guildNames,
		startingTowns,
		goal,
		fillMap: parameters.get('f') === '1',
		castleLast: parameters.get('c') === '1',
		inactive,
		fewestDays: parameters.get('d') === '1',
		targets: byHand,
		played,
		plan,
		received: parameters.get('s') === '1',
	};
}
