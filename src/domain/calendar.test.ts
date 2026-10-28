// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {
	currentDay,
	dayOfRagnarok,
	ragnarokWeek,
	startOfWeek,
} from './calendar.ts';

// 1 to 7 October 2025 ran Wednesday to Tuesday, in local time.
const on = (date: number, hour = 12) => new Date(2025, 9, date, hour);

describe('dayOfRagnarok', () => {
	it('counts Wednesday to Monday as days 1 to 6, and Tuesday after them', () => {
		expect([1, 2, 3, 4, 5, 6, 7].map(date => dayOfRagnarok(on(date)))).toEqual([
			1, 2, 3, 4, 5, 6, 7,
		]);
	});

	it('follows the device\'s calendar day, whatever the hour', () => {
		expect(dayOfRagnarok(on(2, 0))).toBe(2);
		expect(dayOfRagnarok(on(2, 23))).toBe(2);
	});
});

describe('currentDay', () => {
	it('shows Monday\'s declares once the week is over', () => {
		expect(currentDay(on(6))).toBe(6);
		expect(currentDay(on(7))).toBe(6);
		expect(currentDay(on(8))).toBe(1);
	});
});

describe('ragnarokWeek', () => {
	// Wednesday 21 October 2026 began week 0.
	const october = (date: number, hour = 12) => new Date(2026, 9, date, hour);

	it('turns on Wednesday, at the start of the day on the device', () => {
		expect(ragnarokWeek(october(20, 23))).toBe(-1);
		expect(ragnarokWeek(october(21, 0))).toBe(0);
		// Tuesday still shows the results of the week before.
		expect(ragnarokWeek(october(27, 23))).toBe(0);
		expect(ragnarokWeek(october(28, 0))).toBe(1);
	});

	it('keeps counting across months, years and clock changes', () => {
		// Clocks go back in much of Europe on 25 October 2026.
		expect(ragnarokWeek(october(25, 23))).toBe(0);
		expect(ragnarokWeek(new Date(2026, 10, 4))).toBe(2);
		expect(ragnarokWeek(new Date(2027, 0, 6))).toBe(11);
		expect(ragnarokWeek(new Date(2026, 9, 14))).toBe(-1);
	});
});

describe('startOfWeek', () => {
	it('gives the Wednesday each week begins on, at midnight on the device', () => {
		expect(startOfWeek(0)).toEqual(new Date(2026, 9, 21));
		expect(startOfWeek(2)).toEqual(new Date(2026, 10, 4));
		expect(startOfWeek(-1)).toEqual(new Date(2026, 9, 14));
	});

	it('starts the week ragnarokWeek counts it in', () => {
		for (const week of [-60, -1, 0, 1, 11, 60]) {
			expect(ragnarokWeek(startOfWeek(week))).toBe(week);
			const lastMoment = new Date(startOfWeek(week).getTime() - 1);
			expect(ragnarokWeek(lastMoment)).toBe(week - 1);
		}
	});

	it('starts on the day dayOfRagnarok counts as the first', () => {
		for (const week of [-1, 0, 1, 11]) {
			expect(dayOfRagnarok(startOfWeek(week))).toBe(1);
		}
	});
});
