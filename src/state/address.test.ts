// @vitest-environment happy-dom
// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import {AddressBar} from './address.ts';

/**
Makes `replaceState` refuse the next `times` calls, as Safari does when
the address changes too often.
*/
const refuse = (times: number) => {
	const replaceState = history.replaceState.bind(history);
	let refusals = times;
	return vi.spyOn(history, 'replaceState').mockImplementation((...arguments_) => {
		if (refusals > 0) {
			refusals--;
			throw new DOMException('Too many calls', 'SecurityError');
		}

		replaceState(...arguments_);
	});
};

beforeEach(() => {
	history.replaceState(null, '', '/planner/?lang=fr');
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('AddressBar', () => {
	it('replaces the fragment, keeping the path and query', () => {
		const pushState = vi.spyOn(history, 'pushState');
		const before = history.length;
		new AddressBar().show('v=1&m=floating-city');
		expect(location.pathname).toBe('/planner/');
		expect(location.search).toBe('?lang=fr');
		expect(location.hash).toBe('#v=1&m=floating-city');
		expect(history.length).toBe(before);
		expect(pushState).not.toHaveBeenCalled();
	});

	it('leaves the address alone when it already shows the fragment', () => {
		const address = new AddressBar();
		address.show('v=1');
		const replaceState = vi.spyOn(history, 'replaceState');
		address.show('v=1');
		expect(replaceState).not.toHaveBeenCalled();
	});

	it('tries again a second later when the browser refuses', () => {
		const replaceState = refuse(2);
		const address = new AddressBar();
		address.show('v=1');
		expect(location.hash).toBe('');
		vi.advanceTimersByTime(999);
		expect(replaceState).toHaveBeenCalledOnce();
		vi.advanceTimersByTime(1);
		expect(replaceState).toHaveBeenCalledTimes(2);
		expect(location.hash).toBe('');
		vi.advanceTimersByTime(1000);
		expect(location.hash).toBe('#v=1');
		vi.advanceTimersByTime(5000);
		expect(replaceState).toHaveBeenCalledTimes(3);
	});

	it('drops a pending retry when a newer fragment arrives', () => {
		refuse(1);
		const address = new AddressBar();
		address.show('v=1');
		address.show('v=2');
		expect(location.hash).toBe('#v=2');
		vi.advanceTimersByTime(1000);
		expect(location.hash).toBe('#v=2');
	});

	it('drops a pending retry when stopped', () => {
		const replaceState = refuse(1);
		const address = new AddressBar();
		address.show('v=1');
		address.stop();
		vi.advanceTimersByTime(5000);
		expect(replaceState).toHaveBeenCalledOnce();
		expect(location.hash).toBe('');
	});
});
