// @vitest-environment happy-dom
// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {flushSync} from 'svelte';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import {currentLocale, setLocale} from '../i18n/i18n.svelte.ts';
import {LocaleState} from './locale.svelte.ts';

const speak = (...languages: string[]) =>
	vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);

beforeEach(() => {
	localStorage.clear();
});
afterEach(async () => {
	vi.restoreAllMocks();
	await setLocale('en');
});

describe('LocaleState', () => {
	it('speaks the first of the device\'s languages it knows', async () => {
		speak('nl-BE', 'zh-TW', 'en');
		const locale = new LocaleState();
		expect(locale.locale).toBe('zh-Hant');
		await locale.ready();
		expect(currentLocale()).toBe('zh-Hant');
		expect(document.documentElement.lang).toBe('zh-Hant');
	});

	it('falls back to English', () => {
		speak('nl-BE');
		expect(new LocaleState().locale).toBe('en');
	});

	it('remembers the player\'s choice over the device\'s', () => {
		speak('de-DE');
		new LocaleState().choose('it');
		expect(new LocaleState().locale).toBe('it');
	});

	it('switches language when the player picks another', async () => {
		speak('en-GB');
		const locale = new LocaleState();
		await locale.ready();
		const stop = locale.start();
		locale.choose('ko');
		flushSync();
		await vi.waitFor(() => {
			expect(currentLocale()).toBe('ko');
		});
		expect(document.documentElement.lang).toBe('ko');
		stop();
	});

	it('ignores a saved language it no longer offers', () => {
		speak('fr');
		localStorage.setItem('ragnapax/language', 'tlh');
		expect(new LocaleState().locale).toBe('fr');
	});
});
