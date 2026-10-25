// @vitest-environment happy-dom
// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
	afterEach,
	beforeEach,
	expect,
	it,
	vi,
} from 'vitest';
import {
	DelayedSave,
	forgetAll,
	loadSaved,
	saveMap,
} from './storage.ts';

beforeEach(() => {
	localStorage.clear();
});

it('forgets setups and preferences, and nothing else', async () => {
	saveMap('floating-city', 'v=1&m=floating-city');
	localStorage.setItem('ragnapax/theme', 'dark');
	localStorage.setItem('ragnapax/language', 'fr');
	localStorage.setItem('another-app', 'kept');

	await forgetAll();

	expect(loadSaved()).toEqual({maps: {}});
	expect(localStorage.length).toBe(1);
	expect(localStorage.getItem('another-app')).toBe('kept');
});

it('keeps a link per map, and drops whatever else is stored', () => {
	saveMap('floating-city', 'v=1&m=floating-city');
	saveMap('galaxy-terminal', 'v=1&m=galaxy-terminal');
	expect(loadSaved()).toEqual({
		maps: {'floating-city': 'v=1&m=floating-city', 'galaxy-terminal': 'v=1&m=galaxy-terminal'},
	});

	localStorage.setItem(
		'ragnapax/v1',
		JSON.stringify({maps: {'floating-city': {link: 'v=1', quality: 'proven'}, 'sea-of-poseidon': 'v=1'}}),
	);
	expect(loadSaved()).toEqual({maps: {'sea-of-poseidon': 'v=1'}});

	for (const corrupt of ['null', '[]', '"text"', '{"maps": 3}', '{']) {
		localStorage.setItem('ragnapax/v1', corrupt);
		expect(loadSaved()).toEqual({maps: {}});
	}
});

it('saves a moment after the last change, once', () => {
	vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
	const setItem = vi.spyOn(localStorage, 'setItem');
	const saving = new DelayedSave(500);
	saving.save('floating-city', 'v=1&g=O');
	vi.advanceTimersByTime(400);
	saving.save('floating-city', 'v=1&g=Ow');
	vi.advanceTimersByTime(400);
	saving.save('floating-city', 'v=1&g=Owl');
	expect(setItem).not.toHaveBeenCalled();

	vi.advanceTimersByTime(500);
	expect(setItem).toHaveBeenCalledOnce();
	expect(loadSaved().maps).toEqual({'floating-city': 'v=1&g=Owl'});
});

it('saves at once a change waiting for another map, or on request', () => {
	vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
	const saving = new DelayedSave(500);
	saving.save('floating-city', 'v=1&m=floating-city');
	saving.save('galaxy-terminal', 'v=1&m=galaxy-terminal');
	expect(loadSaved().maps).toEqual({'floating-city': 'v=1&m=floating-city'});

	saving.flush();
	expect(loadSaved().maps['galaxy-terminal']).toBe('v=1&m=galaxy-terminal');
});

it('forgets a change still waiting when told to', () => {
	vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
	const saving = new DelayedSave(500);
	saving.save('floating-city', 'v=1&m=floating-city');
	saving.drop();
	vi.runAllTimers();
	saving.flush();
	expect(loadSaved().maps).toEqual({});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.useRealTimers();
});

/**
Stands in for the app's service worker registration and the cache storage.
*/
function stubOffline(scope: string) {
	const unregister = vi.fn(async () => true);
	const deleteCache = vi.fn(async (_name: string) => true);
	vi.stubGlobal('navigator', {
		...navigator,
		serviceWorker: {getRegistration: async () => ({scope, unregister})},
	});
	vi.stubGlobal('caches', {delete: deleteCache});
	return {unregister, deleteCache};
}

it('forgets the offline copy of the planner', async () => {
	const {unregister, deleteCache} = stubOffline(new URL('./', location.href).href);

	await forgetAll();

	expect(unregister).toHaveBeenCalled();
	expect(deleteCache).toHaveBeenCalledWith('ragnapax');
});

it('leaves the workers of other sites on the same origin alone', async () => {
	const {unregister} = stubOffline(`${location.origin}/another-site/`);

	await forgetAll();

	expect(unregister).not.toHaveBeenCalled();
});
