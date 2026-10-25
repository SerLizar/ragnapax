// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// Seeded random test data, the same on every run and every JavaScript
// engine, shared by the tests and the benchmark.

import type {GameMap} from '../domain/map.ts';
import type {StartingTowns} from '../domain/plan.ts';
import {GUILD_COUNT, TOWNS_PER_GUILD} from '../domain/types.ts';

/* eslint-disable no-bitwise -- mulberry32 is 32-bit integer arithmetic */
/**
Pseudo-random numbers in [0, 1) from a seed, the same on every run and
every JavaScript engine, so runs are comparable: mulberry32, a small
32-bit generator that mixes its state well enough for consecutive seeds
to give unrelated openings.

The arithmetic must stay in 32-bit integers (`Math.imul`, `>>>`). An
earlier generator multiplied in ordinary numbers, whose products passed
2^53 and lost their low bits, so it was not the generator it meant to be.
*/
export function random(seed: number) {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6D_2B_79_F5) >>> 0;
		let t = Math.imul(state ^ (state >>> 15), state | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / (2 ** 32);
	};
}
/* eslint-enable no-bitwise */

/**
A random valid opening: each guild gets `TOWNS_PER_GUILD` random towns.
*/
export function randomStart(map: GameMap, seed: number): StartingTowns {
	const next = random(seed);
	const towns = map.towns.map(t => map.kingdoms[t]!.id);
	for (let i = towns.length - 1; i > 0; i--) {
		const j = Math.floor(next() * (i + 1));
		const swapped = towns[i]!;
		towns[i] = towns[j]!;
		towns[j] = swapped;
	}

	const start: Record<string, number> = {};
	for (const [i, id] of towns.slice(0, GUILD_COUNT * TOWNS_PER_GUILD).entries()) {
		start[id] = i % GUILD_COUNT;
	}

	return start;
}
