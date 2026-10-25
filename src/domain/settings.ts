// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {GUILDS, type GuildIndex, type KingdomKind} from './types.ts';

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
};

export const DEFAULT_SETTINGS: PlanSettings = {
	goal: 'resources',
	fillMap: false,
	castleLast: false,
	inactive: [],
};

/**
The guilds that play, in guild order: every one not sitting out.
*/
export const activeGuilds = ({inactive}: Pick<PlanSettings, 'inactive'>): GuildIndex[] =>
	GUILDS.filter(g => !inactive.includes(g));

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
	| {readonly kind: 'total'};

const gap = (measure: Measure): Criterion => ({kind: 'gap', measure});
const TOTAL: Criterion = {kind: 'total'};

/**
The planner's priorities for some settings, most important first. Each one
strictly outranks everything after it, and the solver proves each optimal.
`refinements` and then the fewest declarations break remaining ties.

Equal points also narrows the castle and dormitory gaps: otherwise one guild
could hold the castle all week and make the points up elsewhere.
*/
export function priorities({goal, fillMap}: PlanSettings): Criterion[] {
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
the fewest declarations. The solver improves these while it polishes a plan
but does not prove them optimal: proving them took minutes on some openings.

Equal resources while filling the map narrows the points gap, so leftover
days of different kinds go to different guilds: two extra castle-days and
two extra town-days go to four guilds, not to the same two.
*/
export function refinements({goal, fillMap}: PlanSettings): Criterion[] {
	return goal === 'resources' && fillMap ? [gap('points')] : [];
}

/**
A measure that must never increase down the guild list, or with `ascending`,
never decrease.
*/
export type GuildOrder = {readonly measure: Measure; readonly ascending: boolean};

/**
How guild totals are ordered down the list of guilds that play, so any
uneven share goes to the first guilds, or for castle-days with `castleLast`,
to the last. Only used
when filling the map, as otherwise the main measure is perfectly even anyway.

Ordering each kind of holding separately would hand every kind's extra to the
first guild, so equal resources orders by points too: the guilds with the
most valuable extras come first.
*/
export function guildOrders({fillMap, castleLast}: PlanSettings): GuildOrder[] {
	if (!fillMap) {
		return [];
	}

	const points: GuildOrder = {measure: 'points', ascending: false};
	return castleLast ? [points, {measure: 'castle', ascending: true}] : [points];
}
