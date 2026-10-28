// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {startOfWeek} from '../domain/calendar.ts';
import type {StartingTowns} from '../domain/plan.ts';
import {ANCHOR_WEEK, mapOfWeek, ROTATION} from '../maps/index.ts';

/**
A plausible Floating City opening: four clustered towns per guild, Q vacant.
*/
export const FLOATING_CITY_START: StartingTowns = {
	A: 0,
	E: 0,
	F: 0,
	B: 0,
	C: 1,
	D: 1,
	G: 1,
	J: 1,
	M: 2,
	N: 2,
	R: 2,
	P: 2,
	K: 3,
	H: 3,
	L: 3,
	O: 3,
};

/**
Noon on `day` of the Ragnarok (1 on Wednesday to 7 on Tuesday) in the first
week from the rotation's anchor that plays the map `mapId`, for tests that
need the planner to open on that map. Found from the rotation, so moving
the anchor after a cluster change leaves the tests alone.
*/
export function dayInWeekOf(mapId: string, day = 1): Date {
	for (let week = ANCHOR_WEEK; week < ANCHOR_WEEK + ROTATION.length; week++) {
		const wednesday = startOfWeek(week);
		const date = new Date(wednesday.getFullYear(), wednesday.getMonth(), wednesday.getDate() + day - 1, 12);
		if (mapOfWeek(date).id === mapId) {
			return date;
		}
	}

	throw new Error(`No week of the rotation plays ${mapId}`);
}
