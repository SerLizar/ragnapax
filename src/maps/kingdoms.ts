// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {KingdomDefinition} from '../domain/types.ts';

/**
Every dormitory in Ragnarok, with the short name players use for it. Each
map has some of them; the names and short names are the same everywhere.
*/
const DORMITORIES = {
	Dionysia: 'Dio',
	Vagastrom: 'Vaga',
	Frostheim: 'Frost',
	Hotarubi: 'Hota',
	Obscuary: 'Obs',
	Mortkranken: 'Mort',
	Jabberwock: 'Jabber',
	Sinostra: 'Sino',
} as const;

export type Dormitory = keyof typeof DORMITORIES;

/**
Town `id`, a single letter as in the game.
*/
export const town = (id: string, x: number, y: number): KingdomDefinition => ({
	id,
	name: `Town ${id}`,
	label: id,
	kind: 'town',
	x,
	y,
});

export const dorm = (id: Dormitory, x: number, y: number): KingdomDefinition => ({
	id,
	name: id,
	label: DORMITORIES[id],
	kind: 'dormitory',
	x,
	y,
});

/**
Darkwick Castle, at the heart of every map.
*/
export const castle = (x: number, y: number): KingdomDefinition => ({
	id: 'Darkwick',
	name: 'Darkwick Castle',
	label: 'Castle',
	kind: 'castle',
	x,
	y,
});
