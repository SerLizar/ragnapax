// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// Holds every translation to the English catalogue, so a translator's slip
// fails here rather than on someone's phone. See docs/TRANSLATING.md.

import {describe, expect, it} from 'vitest';
import type {Translation} from './catalogue.ts';
import en from './en.ts';
import {
	placeholders,
	pluralRulesFor,
	type Catalogue,
	type Message,
} from './format.ts';
import {LOCALES, SOURCE_LOCALE} from './locales.ts';

const files = import.meta.glob<{default: Translation}>('./translations/*.ts', {eager: true});
const translations = Object.fromEntries(
	Object.entries(files).map(([path, module]) => [
		path.slice(path.lastIndexOf('/') + 1, -'.ts'.length),
		module.default as Catalogue,
	]),
);
const english: Catalogue = en;

const texts = (message: Message): string[] =>
	typeof message === 'string' ? [message] : Object.values(message);

/**
Plural categories a language needs for the numbers the app shows.
*/
function neededCategories(locale: string): Set<string> {
	const rules = pluralRulesFor(locale);
	return new Set(Array.from({length: 1001}, (_, n) => rules.select(n)));
}

it('has a file for every language but English, and no others', () => {
	const expected = LOCALES.map(l => l.code).filter(c => c !== SOURCE_LOCALE);
	expect(Object.keys(translations).toSorted()).toEqual(expected.toSorted());
});

describe.each([SOURCE_LOCALE, ...Object.keys(translations)])('%s messages', locale => {
	const catalogue = locale === SOURCE_LOCALE ? english : translations[locale]!;
	const entries = Object.entries(catalogue);

	it('only use keys that English has', () => {
		expect(Object.keys(catalogue).filter(key => !Object.hasOwn(english, key))).toEqual([]);
	});

	it('are plain text or plural forms, never empty', () => {
		for (const [key, message] of entries) {
			const isOk =
				typeof message === 'string'
					? message.trim() !== ''
					: typeof message === 'object'
						&& Object.values(message).every(m => typeof m === 'string' && m.trim() !== '');
			expect(isOk, key).toBe(true);
		}
	});

	it('mark bold in pairs, where English does', () => {
		const bold = (text: string) => text.split('**').length - 1;
		for (const [key, message] of entries) {
			const source = english[key];
			for (const text of texts(message)) {
				expect(bold(text) % 2, `${key} has an unclosed **`).toBe(0);
				if (source !== undefined) {
					expect(bold(text) > 0, `${key} bold`).toBe(bold(texts(source)[0]!) > 0);
				}
			}
		}
	});

	it('keep English\'s placeholders, adding none', () => {
		for (const [key, message] of entries) {
			const source = english[key];
			if (source === undefined) {
				continue;
			}

			const allowed = new Set(texts(source).flatMap(text => [...placeholders(text)]));
			if (typeof source !== 'string') {
				allowed.add('count');
			}

			const used = new Set(texts(message).flatMap(text => [...placeholders(text)]));
			expect(
				[...used].filter(p => !allowed.has(p)),
				`${key} adds`,
			).toEqual([]);
			// Only the general form must show the count: a singular may say "one town".
			const general = (m: Message) => placeholders(typeof m === 'string' ? m : m.other);
			const dropped = [...allowed].filter(p =>
				p === 'count' ? general(source).has(p) && !general(message).has(p) : !used.has(p),
			);
			expect(dropped, `${key} drops`).toEqual([]);
		}
	});

	it('give plurals exactly the forms the language needs', () => {
		const allowed = new Set(pluralRulesFor(locale).resolvedOptions().pluralCategories);
		const needed = neededCategories(locale);
		for (const [key, message] of entries) {
			if (typeof message === 'string') {
				// Languages with a single form may write plurals as plain text.
				const source = english[key];
				if (source !== undefined && typeof source !== 'string') {
					expect(needed.size, `${key} needs plural forms`).toBe(1);
				}

				continue;
			}

			const forms = Object.keys(message);
			expect(
				forms.filter(f => !allowed.has(f as Intl.LDMLPluralRule)),
				`${key} has forms ${locale} does not use`,
			).toEqual([]);
			expect(
				[...needed].filter(f => !forms.includes(f)),
				`${key} is missing forms`,
			).toEqual([]);
		}
	});
});

it.each(LOCALES.filter(l => l.ready && l.code !== SOURCE_LOCALE))(
	'has every message in $english, which is marked ready',
	({code}) => {
		const catalogue = translations[code]!;
		expect(Object.keys(english).filter(key => !Object.hasOwn(catalogue, key))).toEqual([]);
	},
);
