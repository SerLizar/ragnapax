// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {StartingTowns} from '../domain/plan.ts';

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
