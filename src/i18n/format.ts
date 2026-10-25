// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
Message formatting, deliberately tiny: `{name}` placeholders and plural
forms chosen by `Intl.PluralRules`. That covers every message the app has,
in every language it supports, without a formatting library on 3G.
*/

export type PluralCategory = Intl.LDMLPluralRule;

/**
A message that depends on `{count}`, with one text per plural category the
language uses (see https://cldr.unicode.org/index/cldr-spec/plural-rules).
English uses `one` and `other`; Japanese, Korean and Chinese only `other`.
*/
export type Plural = {readonly other: string} & Partial<Record<PluralCategory, string>>;

export type Message = string | Plural;

/**
A language's messages by key. Missing keys fall back to English.
*/
export type Catalogue = Readonly<Record<string, Message>>;

export type MessageParameters = Readonly<Record<string, string | number>>;

const pluralRules = new Map<string, Intl.PluralRules>();

/**
The plural rules of a language, created once.
*/
export function pluralRulesFor(locale: string): Intl.PluralRules {
	let rules = pluralRules.get(locale);
	if (!rules) {
		pluralRules.set(locale, (rules = new Intl.PluralRules(locale)));
	}

	return rules;
}

const PLACEHOLDER = /\{(?<name>\w+)\}/gu;

/**
Marks bold text, as in `Every guild scores **50 points**.`
*/
const BOLD = '**';

/**
The text for a message: plural messages pick their form from `params.count`.
*/
function select(locale: string, message: Message, parameters: MessageParameters): string {
	return typeof message === 'string'
		? message
		: (message[pluralRulesFor(locale).select(Number(parameters.count))] ?? message.other);
}

/**
Unknown placeholders are left as they are, so a mistake shows up on screen
instead of silently dropping words.
*/
const fill = (text: string, parameters: MessageParameters) =>
	text.replaceAll(PLACEHOLDER, (match, name: string) => {
		const value = parameters[name];
		return value === undefined ? match : String(value);
	});

/**
Fills in a message as plain text, without bold.
*/
export function formatMessage(
	locale: string,
	message: Message,
	parameters: MessageParameters = {},
): string {
	return fill(select(locale, message, parameters).replaceAll(BOLD, ''), parameters);
}

/**
A run of text, bold or not.
*/
export type Part = {
	readonly text: string;
	readonly bold: boolean;
};

/**
Fills in a message as runs of plain and bold text, for `Rich.svelte`.
Bold is marked before filling in, so a guild called "**" stays text.
*/
export function formatParts(
	locale: string,
	message: Message,
	parameters: MessageParameters = {},
): Part[] {
	return select(locale, message, parameters)
		.split(BOLD)
		.map((piece, i) => ({text: fill(piece, parameters), bold: i % 2 === 1}))
		.filter(part => part.text !== '');
}

/**
Every placeholder written in some text, e.g. `guild` in "Declares for {guild}".
*/
export function placeholders(text: string): Set<string> {
	return new Set([...text.matchAll(PLACEHOLDER)].map(({groups}) => groups!.name!));
}

/**
Placeholder names in a message type, so calls must supply every one.
*/
type PlaceholdersIn<S extends string> = S extends `${string}{${infer P}}${infer Rest}`
	? P | PlaceholdersIn<Rest>
	: never;

export type PlaceholdersOf<M> = M extends string
	? PlaceholdersIn<M>
	: M extends Plural
		? PlaceholdersIn<Extract<M[keyof M], string>> | 'count'
		: never;

/**
The arguments a message needs: nothing, or a value for each placeholder.
*/
export type ArgsOf<M> = [PlaceholdersOf<M>] extends [never]
	// eslint-disable-next-line @typescript-eslint/no-restricted-types -- no arguments at all
	? []
	: [parameters: Readonly<Record<PlaceholdersOf<M>, string | number>>];
