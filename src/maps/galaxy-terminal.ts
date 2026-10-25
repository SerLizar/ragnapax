// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {MapDefinition} from '../domain/types.ts';
import {castle, dorm, town} from './kingdoms.ts';

/**
The Galaxy Terminal. Positions follow the in-game layout; only roads affect
planning. A game update replaced Jabberwock with Dionysia on this map, in the
same place.
*/
export const galaxyTerminal: MapDefinition = {
	id: 'galaxy-terminal',
	name: 'The Galaxy Terminal',
	kingdoms: [
		town('A', 94, 39),
		town('B', 80, 24),
		town('C', 60, 24),
		town('D', 57, 9),
		town('E', 40, 16),
		town('F', 96, 60),
		town('G', 66, 40),
		town('H', 45, 37),
		town('J', 23, 23),
		town('K', 4, 23),
		town('L', 94, 80),
		town('M', 52, 52),
		town('N', 4, 46),
		town('O', 57, 94),
		town('P', 34, 94),
		town('Q', 22, 76),
		town('R', 15, 60),
		dorm('Sinostra', 20, 4),
		dorm('Dionysia', 26, 37),
		dorm('Vagastrom', 38, 57),
		dorm('Frostheim', 45, 71),
		dorm('Hotarubi', 79, 53),
		dorm('Obscuary', 78, 96),
		castle(71, 72),
	],
	roads: [
		['A', 'B'],
		['A', 'F'],
		['B', 'C'],
		['C', 'D'],
		['C', 'G'],
		['D', 'E'],
		['E', 'Sinostra'],
		['F', 'L'],
		['F', 'Hotarubi'],
		['G', 'H'],
		['G', 'Hotarubi'],
		['H', 'M'],
		['H', 'Dionysia'],
		['J', 'Sinostra'],
		['J', 'Dionysia'],
		['K', 'N'],
		['K', 'Sinostra'],
		['L', 'Darkwick'],
		['M', 'Frostheim'],
		['N', 'R'],
		['O', 'P'],
		['O', 'Obscuary'],
		['P', 'Q'],
		['P', 'Frostheim'],
		['Q', 'R'],
		['Q', 'Vagastrom'],
		['Dionysia', 'Vagastrom'],
		['Vagastrom', 'Frostheim'],
		['Frostheim', 'Darkwick'],
		['Hotarubi', 'Darkwick'],
		['Obscuary', 'Darkwick'],
	],
};
