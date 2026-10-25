// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {DAYS} from './types.ts';

/**
Which day of the Ragnarok `date` falls on, by the device's own calendar:
1 on Wednesday to `DAYS` (6) on Monday, and `DAYS + 1` on Tuesday, when the
week is over and the game only shows its results.

The device's clock stands in for the game's server time: players open the
planner on the day they play, and a few hours either side of midnight
matters little next to not having to know the server's time zone.
*/
export function dayOfRagnarok(date: Date): number {
	// `getDay` counts from Sunday (0); Wednesday is 3.
	return ((date.getDay() + 7 - 3) % 7) + 1;
}

/**
The scored day whose declares matter on `date`: today's, or Monday's once
the week is over.
*/
export const currentDay = (date: Date): number => Math.min(dayOfRagnarok(date), DAYS);

/**
The Tuesday that began week 0 of `ragnarokWeek`, 20 October 2026.
*/
const WEEK_ZERO = Date.UTC(2026, 9, 20);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
Which Ragnarok week `date` falls in, by the device's calendar like
`dayOfRagnarok`: 0 for the week from Tuesday 20 October 2026, counting up
after it and down before it. Weeks turn on Tuesday, when the last Ragnarok
only shows its results and players look ahead to the next.
*/
export function ragnarokWeek(date: Date): number {
	// The local date as UTC, so a clock change cannot shift a day.
	const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
	return Math.floor((day - WEEK_ZERO) / WEEK_MS);
}
