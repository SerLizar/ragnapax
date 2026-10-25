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
Where week 0 of `ragnarokWeek` (from Tuesday 20 October 2026) comes in the
rotation: The Sea of Poseidon's week.
*/
const WEEK_ZERO_PLACE = ROTATION.findIndex(map => map.id === seaOfPoseidon.id);

/**
The map every group plays in the week of `date`, by default this week.
*/
export function mapOfWeek(date = new Date()): GameMap {
	const n = ROTATION.length;
	return ROTATION[(((ragnarokWeek(date) + WEEK_ZERO_PLACE) % n) + n) % n]!;
}
