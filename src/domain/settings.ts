// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {GameMap} from './map.ts';
import {
	GUILDS,
	KINGDOM_KINDS,
	type GuildIndex,
	type Holdings,
	type KingdomKind,
} from './types.ts';

/**
What "fair" means for a plan.
*/
export type Goal = 'points' | 'resources';

export const GOALS: readonly Goal[] = ['resources', 'points'];

/**
How a plan should be made.
*/
export type PlanSettings = {
	readonly goal: Goal;
	/**
	Hold as much of the map as possible before evening guilds out. Totals may
	then differ slightly; the guilds with extra points come first.
	*/
	readonly fillMap: boolean;
	/**
	While filling the map, hand the extra castle-days to the last guilds rather
	than the first. Points still never increase down the guild list, so the
	first guilds make theirs up with other kingdoms.
	*/
	readonly castleLast: boolean;
	/**
	Guilds sitting this Ragnarok out, in guild order: the game put them in
	the group for their power, but they do not play. They make no
	declarations, nobody declares on what they hold, and they do not count
	when sharing out the points. At least one guild always plays.
	*/
	readonly inactive: readonly GuildIndex[];
	/**
	Once fairness is settled, have each guild declare on as few days as
	possible, so players log in to declare less often, before making the
	fewest declarations.
	*/
	readonly fewestDays: boolean;
	/**
	Each guild's holdings over the Ragnarok, set by hand, in guild order:
	the plan comes as close to them as it can, instead of sharing by the
	goal, and never fills the map or orders the guilds. Guilds sitting out
	keep what they hold, whatever is set for them. Undefined to share by the
	goal.
	*/
	readonly targets?: readonly Holdings[];
};

export const DEFAULT_SETTINGS: PlanSettings = {
	goal: 'resources',
	fillMap: false,
	castleLast: false,
	inactive: [],
	fewestDays: false,
};

/**
The guilds that play, in guild order: every one not sitting out.
*/
export const activeGuilds = ({inactive}: Pick<PlanSettings, 'inactive'>): GuildIndex[] =>
	GUILDS.filter(g => !inactive.includes(g));

/**
Kinds of kingdom whose holdings set by hand add up, over the guilds that
play, to more days than the map has: every kingdom of the kind, every day.
No plan can then reach them, so the interface warns.
*/
export function excessTargets(
	map: Pick<GameMap, 'mostHeld'>,
	settings: Pick<PlanSettings, 'inactive' | 'targets'>,
): Array<{readonly kind: KingdomKind; readonly count: number; readonly most: number}> {
	const {targets} = settings;
	if (!targets) {
		return [];
	}

	const playing = activeGuilds(settings);
	return KINGDOM_KINDS.map(kind => ({
		kind,
		count: playing.reduce((sum, g) => sum + (targets[g]?.[kind] ?? 0), 0),
		most: map.mostHeld[kind],
	})).filter(({count, most}) => count > most);
}

/**
A per-guild quantity summed over the Ragnarok: points, or days holding a kind.
*/
export type Measure = 'points' | KingdomKind;

/**
Something the planner optimises, from most to least important.
*/
export type Criterion =
	/**
	Smallest difference in a measure between the best and worst-off guild.
	*/
	| {readonly kind: 'gap'; readonly measure: Measure}
	/**
	Most points for all guilds together, i.e. the most of the map held.
	*/
	| {readonly kind: 'total'}
	/**
	Fewest kingdom-days of a kind between the holdings set by hand and the
	plan's, summed over the guilds that play.
	*/
	| {readonly kind: 'miss'; readonly measure: KingdomKind};

const gap = (measure: Measure): Criterion => ({kind: 'gap', measure});
const TOTAL: Criterion = {kind: 'total'};
const miss = (measure: KingdomKind): Criterion => ({kind: 'miss', measure});

/**
The planner's priorities for some settings, most important first. Each one
strictly outranks everything after it, and the solver proves each optimal.
`refinements` and then `efforts` break remaining ties.

Equal points also narrows the castle and dormitory gaps: otherwise one guild
could hold the castle all week and make the points up elsewhere. Holdings
set by hand replace the goal, the most valuable kind first, as equal
resources ranks them.
*/
export function priorities({goal, fillMap, targets}: PlanSettings): Criterion[] {
	if (targets) {
		return [miss('castle'), miss('dormitory'), miss('town')];
	}

	const fairness =
		goal === 'points'
			? [gap('points'), gap('castle'), gap('dormitory')]
			: [gap('castle'), gap('dormitory'), gap('town')];
	if (fillMap) {
		return [TOTAL, ...fairness];
	}

	return goal === 'points' ? [fairness[0]!, TOTAL, ...fairness.slice(1)] : [...fairness, TOTAL];
}

/**
Tie-breakers after the priorities, most important first, still outranking
`efforts`. The solver improves these while it polishes a plan
but does not prove them optimal: proving them took minutes on some openings.

Equal resources while filling the map narrows the points gap, so leftover
days of different kinds go to different guilds: two extra castle-days and
two extra town-days go to four guilds, not to the same two.
*/
export function refinements({goal, fillMap, targets}: PlanSettings): Criterion[] {
	return goal === 'resources' && fillMap && !targets ? [gap('points')] : [];
}

/**
The work a plan asks of the guilds, kept down after every priority and
refinement, most important first.

- `days`: days on which a guild declares, summed over the guilds.
- `declarations`: declarations over the Ragnarok, by every guild.
*/
export type Effort = 'days' | 'declarations';

export const efforts = ({fewestDays}: Pick<PlanSettings, 'fewestDays'>): Effort[] =>
	fewestDays ? ['days', 'declarations'] : ['declarations'];

/**
A measure that must never increase down the guild list, or with `ascending`,
never decrease.
*/
export type GuildOrder = {readonly measure: Measure; readonly ascending: boolean};

/**
How guild totals are ordered down the list of guilds that play, so any
uneven share goes to the first guilds, or for castle-days with `castleLast`,
to the last. Only used
when filling the map, as otherwise the main measure is perfectly even anyway,
and never with holdings set by hand, which say who gets what.

Ordering each kind of holding separately would hand every kind's extra to the
first guild, so equal resources orders by points too: the guilds with the
most valuable extras come first.
*/
export function guildOrders({fillMap, castleLast, targets}: PlanSettings): GuildOrder[] {
	if (!fillMap || targets) {
		return [];
	}

	const points: GuildOrder = {measure: 'points', ascending: false};
	return castleLast ? [points, {measure: 'castle', ascending: true}] : [points];
}
