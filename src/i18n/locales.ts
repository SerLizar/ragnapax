// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

export type LocaleInfo = {
	/**
	BCP 47 tag, also the name of the catalogue file in `translations/`.
	*/
	readonly code: string;
	/**
	The language's name in itself, as listed in the language picker.
	*/
	readonly name: string;
	/**
	The language's name in English, for documentation and reviewers.
	*/
	readonly english: string;
	/**
	Whether the translation is finished and reviewed, so players can pick
	it. Unfinished ones are only offered in development builds;
	`catalogues.test.ts` checks that a ready language has every message.
	*/
	readonly ready: boolean;
};

/**
The languages Tokyo Debunkers itself offers.
*/
export const LOCALES = [
	{
		code: 'ja', name: '日本語', english: 'Japanese', ready: false,
	},
	{
		code: 'en', name: 'English', english: 'English', ready: true,
	},
	{
		code: 'fr', name: 'Français', english: 'French', ready: false,
	},
	{
		code: 'de', name: 'Deutsch', english: 'German', ready: false,
	},
	{
		code: 'it', name: 'Italiano', english: 'Italian', ready: false,
	},
	{
		code: 'es', name: 'Español', english: 'Spanish', ready: false,
	},
	{
		code: 'ko', name: '한국어', english: 'Korean', ready: false,
	},
	{
		code: 'zh-Hans', name: '简体中文', english: 'Simplified Chinese', ready: false,
	},
	{
		code: 'zh-Hant', name: '繁體中文', english: 'Traditional Chinese', ready: false,
	},
] as const satisfies readonly LocaleInfo[];

export type Locale = (typeof LOCALES)[number]['code'];

/**
The language the interface is written in, and the fallback for missing messages.
*/
export const SOURCE_LOCALE: Locale = 'en';

export const isLocale = (code: unknown): code is Locale => LOCALES.some(l => l.code === code);

/**
Chinese script for a lowercase tag: as written, or else the region's usual one.
*/
function chineseScript(tag: string): Locale {
	const parts = tag.split('-');
	if (parts.includes('hans')) {
		return 'zh-Hans';
	}

	return parts.includes('hant') || parts.some(p => ['tw', 'hk', 'mo'].includes(p))
		? 'zh-Hant'
		: 'zh-Hans';
}

/**
The best of `available` for the languages a browser asks for, most wanted
first (`navigator.languages`), or undefined if none fits. Matching is by
language, so "fr-CA" gets French, and Chinese by script or region, so
"zh-TW" gets traditional and "zh-CN" simplified characters.
*/
export function matchLocale(
	requested: readonly string[],
	available: readonly Locale[],
): Locale | undefined {
	for (const tag of requested) {
		const lower = tag.toLowerCase();
		const language = lower.split('-', 1)[0];
		const wanted = language === 'zh' ? chineseScript(lower) : language;
		const match = available.find(code => code === wanted);
		if (match !== undefined) {
			return match;
		}
	}

	return undefined;
}
