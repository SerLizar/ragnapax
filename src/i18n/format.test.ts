// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {formatMessage, placeholders} from './format.ts';
import {matchLocale, LOCALES} from './locales.ts';

describe('formatMessage', () => {
	it('fills in placeholders', () => {
		expect(formatMessage('en', 'Declares for {guild} copied', {guild: 'Night Owls'})).toBe(
			'Declares for Night Owls copied',
		);
	});

	it('leaves unknown placeholders visible', () => {
		expect(formatMessage('en', 'Hello {name}')).toBe('Hello {name}');
	});

	it('picks the plural form the language uses for the count', () => {
		const towns = {one: '{count} town', other: '{count} towns'};
		expect(formatMessage('en', towns, {count: 1})).toBe('1 town');
		expect(formatMessage('en', towns, {count: 0})).toBe('0 towns');
		// French treats 0 as singular.
		const villes = {one: '{count} ville', other: '{count} villes'};
		expect(formatMessage('fr', villes, {count: 0})).toBe('0 ville');
		// Japanese has only one form.
		expect(formatMessage('ja', {other: '{count}個の町'}, {count: 1})).toBe('1個の町');
	});

	it('falls back to the other form when a category is missing', () => {
		expect(formatMessage('ar', {other: '{count}'}, {count: 2})).toBe('2');
	});
});

it('lists the placeholders in a text', () => {
	expect([...placeholders('{count} of {total} towns')]).toEqual(['count', 'total']);
});

describe('matchLocale', () => {
	const all = LOCALES.map(l => l.code);

	it('matches by language, ignoring the region', () => {
		expect(matchLocale(['fr-CA'], all)).toBe('fr');
		expect(matchLocale(['de'], all)).toBe('de');
		expect(matchLocale(['es-419'], all)).toBe('es');
	});

	it('takes the first language the browser asks for that is available', () => {
		expect(matchLocale(['nl-NL', 'it-IT', 'en'], all)).toBe('it');
		expect(matchLocale(['fr'], ['en', 'de'])).toBeUndefined();
	});

	it('tells simplified and traditional Chinese apart', () => {
		expect(matchLocale(['zh-CN'], all)).toBe('zh-Hans');
		expect(matchLocale(['zh'], all)).toBe('zh-Hans');
		expect(matchLocale(['zh-Hans-HK'], all)).toBe('zh-Hans');
		expect(matchLocale(['zh-TW'], all)).toBe('zh-Hant');
		expect(matchLocale(['zh-HK'], all)).toBe('zh-Hant');
		expect(matchLocale(['zh-Hant'], all)).toBe('zh-Hant');
	});
});
