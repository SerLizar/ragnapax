// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {currentDay, dayOfRagnarok, ragnarokWeek} from './calendar.ts';

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
	// Tuesday 20 October 2026 began week 0.
	const october = (date: number, hour = 12) => new Date(2026, 9, date, hour);

	it('turns on Tuesday, at the start of the day on the device', () => {
		expect(ragnarokWeek(october(19, 23))).toBe(-1);
		expect(ragnarokWeek(october(20, 0))).toBe(0);
		expect(ragnarokWeek(october(26, 23))).toBe(0);
		expect(ragnarokWeek(october(27, 0))).toBe(1);
	});

	it('keeps counting across months, years and clock changes', () => {
		// Clocks go back in much of Europe on 25 October 2026.
		expect(ragnarokWeek(october(25, 23))).toBe(0);
		expect(ragnarokWeek(new Date(2026, 10, 3))).toBe(2);
		expect(ragnarokWeek(new Date(2027, 0, 5))).toBe(11);
		expect(ragnarokWeek(new Date(2026, 9, 13))).toBe(-1);
	});
});
