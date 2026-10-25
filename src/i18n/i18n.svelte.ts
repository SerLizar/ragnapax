// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {MessageKey, Messages, Translation} from './catalogue.ts';
import en from './en.ts';
import {
	formatMessage,
	formatParts,
	type ArgsOf,
	type Part,
} from './format.ts';
import {SOURCE_LOCALE, type Locale} from './locales.ts';

/**
The interface language. English is bundled; every other language is its
own small file, downloaded only by those who use it.
*/
const loaders = import.meta.glob<{default: Translation}>('./translations/*.ts');

let current = $state.raw<{readonly locale: Locale; readonly messages: Translation}>({
	locale: SOURCE_LOCALE,
	messages: {},
});

/**
The text of a message in the current language, or in English while it has
no translation. Reading it in a component or `$derived` tracks the
language, so text updates when it changes.
*/
export function t<K extends MessageKey>(key: K, ...[parameters]: ArgsOf<Messages[K]>): string {
	const own = current.messages[key];
	return own === undefined
		? formatMessage(SOURCE_LOCALE, en[key], parameters)
		: formatMessage(current.locale, own, parameters);
}

/**
Like `t`, as runs of plain and bold text for `Rich.svelte`.
*/
export function rich<K extends MessageKey>(key: K, ...[parameters]: ArgsOf<Messages[K]>): Part[] {
	const own = current.messages[key];
	return own === undefined
		? formatParts(SOURCE_LOCALE, en[key], parameters)
		: formatParts(current.locale, own, parameters);
}

export const currentLocale = (): Locale => current.locale;

let latest = 0;

/**
Switches language once its messages have loaded. If languages are switched
quickly, the last one asked for wins. Rejects if the file cannot be loaded
(offline on first use), leaving the language as it was.
*/
export async function setLocale(locale: Locale): Promise<void> {
	const request = ++latest;
	const load = loaders[`./translations/${locale}.ts`];
	const module = locale === SOURCE_LOCALE || !load ? undefined : await load();
	const messages = module?.default ?? {};
	if (request === latest) {
		current = {locale, messages};
	}
}

/**
Stands in for a placeholder that the interface fills with markup rather
than text, such as a guild's colour mark: `aroundSlot` then returns the
text either side, whatever the language's word order.
*/
export const SLOT = '\u{0}';

export function aroundSlot(text: string): [before: string, after: string] {
	const at = text.indexOf(SLOT);
	return at === -1 ? [text, ''] : [text.slice(0, at), text.slice(at + SLOT.length)];
}

/**
Caches, not state: formats never change once made.
*/
const dateFormats: Record<string, Intl.DateTimeFormat> = {};
const listFormats: Record<string, Intl.ListFormat> = {};

// Weekdays and lists use the Intl APIs with the interface language, never
// the browser's own setting: a Spanish browser viewing the planner in
// English still gets "Wednesday" and "and". So they need no translation.

/**
Name of scored day `day` (1 is Wednesday, 6 Monday) in the interface language.
*/
export function weekday(day: number, width: 'long' | 'short'): string {
	const key = `${current.locale} ${width}`;
	let format = dateFormats[key];
	if (!format) {
		format = new Intl.DateTimeFormat(current.locale, {weekday: width, timeZone: 'UTC'});
		dateFormats[key] = format;
	}

	// 1 January 2025 was a Wednesday.
	return format.format(Date.UTC(2025, 0, day));
}

/**
Joins items as the interface language writes a list: "A, B, and C".
*/
export function list(items: readonly string[]): string {
	listFormats[current.locale] ??= new Intl.ListFormat(current.locale, {type: 'conjunction'});
	return listFormats[current.locale]!.format(items);
}
