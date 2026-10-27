// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
Kingdom tiers, from least to most valuable.
*/
export const KINGDOM_KINDS = ['town', 'dormitory', 'castle'] as const;
export type KingdomKind = (typeof KINGDOM_KINDS)[number];

/**
Kingdom-days of each kind, such as a guild's over a Ragnarok: one for each
kingdom of the kind held at the end of each day.
*/
export type Holdings = Readonly<Record<KingdomKind, number>>;

/**
Points a guild earns for holding a kingdom of each kind for one day. The
same on every map: this is a fact of the game, not map data.
*/
export const POINTS: Readonly<Record<KingdomKind, number>> = {town: 1, dormitory: 2, castle: 3};

/**
The days of a Ragnarok, in order: Wednesday to Monday on every map. Day 0 is
the starting position, revealed early on Wednesday; day `d` (1 to 6) is the
declares and battle of `DAY_NAMES[d - 1]`, scored at the end of that day.
*/
export const DAY_NAMES = [
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday',
	'Monday',
] as const;

/**
Number of scored days after the starting position (day 0).
*/
export const DAYS = DAY_NAMES.length;

/**
How many kingdoms a guild may declare on in a single day.
*/
export const MAX_DECLARATIONS_PER_DAY = 3;

/**
Towns each guild starts with, drawn at random by the game on every map.
Every other kingdom starts Vacant.
*/
export const TOWNS_PER_GUILD = 4;

/**
A kingdom as written in a map data file.
*/
export type KingdomDefinition = {
	/**
	Stable identifier. Share links place kingdoms in order of their ids
	(see `GameMap.linkOrder`), so renaming, adding or removing a kingdom
	breaks every link and saved setup for its map.
	*/
	readonly id: string;
	/**
	Display name, e.g. "Town A" or "Dionysia".
	*/
	readonly name: string;
	/**
	Short label drawn inside the map marker, e.g. "A" or "Dio".
	*/
	readonly label: string;
	readonly kind: KingdomKind;
	/**
	Position following the in-game layout, x to the right and y down, in any
	unit: the drawing stretches the layout to fill the map.
	*/
	readonly x: number;
	readonly y: number;
};

/**
Declarative description of a Ragnarok map.
*/
export type MapDefinition = {
	/**
	Stable slug, used in URLs and storage keys.
	*/
	readonly id: string;
	readonly name: string;
	readonly kingdoms: readonly KingdomDefinition[];
	/**
	Undirected adjacency between kingdoms, by id.
	*/
	readonly roads: ReadonlyArray<readonly [string, string]>;
	/**
	What each guild holds in a plan for equal resources that does not use
	every kingdom, as the solver makes it from almost every opening: the
	holdings each guild starts with when they are set by hand
	(`PlanSettings.targets`). `solve.test.ts` checks it.
	*/
	readonly fairHoldings: Holdings;
};

/**
Every Ragnarok group, on every map, has exactly four guilds.
*/
export const GUILD_COUNT = 4;

/**
Index of a guild, 0 to 3, in the order players list them.
*/
export type GuildIndex = number;

export const GUILDS: readonly GuildIndex[] = [0, 1, 2, 3];

/**
Owner value for a kingdom nobody holds.
*/
export const VACANT = -1;

/**
Index of a kingdom within its map.
*/
export type KingdomIndex = number;
