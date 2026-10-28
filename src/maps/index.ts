// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {ragnarokWeek} from '../domain/calendar.ts';
import {compileMap, type GameMap} from '../domain/map.ts';
import type {MapDefinition} from '../domain/types.ts';
import {floatingCity} from './floating-city.ts';
import {galaxyTerminal} from './galaxy-terminal.ts';
import {seaOfPoseidon} from './sea-of-poseidon.ts';

/**
Every playable map, in the order they appear in the map picker.
To add a map, create a definition file next to this one and list it here;
`maps.test.ts` checks it automatically.
*/
export const MAP_DEFINITIONS: readonly MapDefinition[] = [
	floatingCity,
	galaxyTerminal,
	seaOfPoseidon,
];

export const MAPS: readonly GameMap[] = MAP_DEFINITIONS.map(definition => compileMap(definition));

/**
The map shown before a setup is restored, and the one tests plan on.
*/
export const DEFAULT_MAP = MAPS[0]!;

export function findMap(id: string | undefined): GameMap | undefined {
	return MAPS.find(m => m.id === id);
}

/**
The maps in the order the game plays them, one a week, round and round:
Galaxy, Sea, then Sky, as players call The Floating City. Every group plays
the same map in a week, so the planner opens on it. A new map goes in its
place here; `maps.test.ts` checks that every map has one.
*/
export const ROTATION: readonly GameMap[] = [galaxyTerminal, seaOfPoseidon, floatingCity].map(
	definition => findMap(definition.id)!,
);

/**
The week of `ragnarokWeek` the rotation counts from, and the map played in
it: The Sea of Poseidon, in week 1, from Tuesday 27 October 2026.
A cluster change (the game regrouping which servers play Ragnarok together)
repeats the last week's map, and one came that week, so the Sea ran in
week 0 too. After the next one, move the anchor to the week it repeats;
weeks before the anchor may come out wrong.
*/
const ANCHOR_WEEK = 1;
const ANCHOR_PLACE = ROTATION.findIndex(map => map.id === seaOfPoseidon.id);

/**
The map every group plays in the week of `date`, by default this week.
*/
export function mapOfWeek(date = new Date()): GameMap {
	const n = ROTATION.length;
	const place = ragnarokWeek(date) - ANCHOR_WEEK + ANCHOR_PLACE;
	return ROTATION[((place % n) + n) % n]!;
}
