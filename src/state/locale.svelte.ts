// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {currentLocale, setLocale, t} from '../i18n/i18n.svelte.ts';
import {
	isLocale,
	LOCALES,
	matchLocale,
	SOURCE_LOCALE,
	type Locale,
} from '../i18n/locales.ts';

/**
Languages players can choose: finished ones, and in development every
one, so translators can see their work in place.
*/
export const LANGUAGES = LOCALES.filter(l => l.ready || import.meta.env.DEV);

const isOffered = (code: unknown): code is Locale =>
	isLocale(code) && LANGUAGES.some(l => l.code === code);

const KEY = 'ragnapax/language';

function load(): Locale | undefined {
	try {
		const saved = localStorage.getItem(KEY);
		return isOffered(saved) ? saved : undefined;
	} catch {
		return undefined;
	}
}

/**
The interface language: the player's choice, or else the first of the
device's languages that the planner speaks, or else English.
*/
export class LocaleState {
	private device = $state<readonly string[]>(navigator.languages ?? [navigator.language]);
	/**
	The language chosen in the picker; undefined to follow the device.
	*/
	preference = $state<Locale | undefined>(load());
	readonly locale: Locale = $derived(
		this.preference
		?? matchLocale(
			this.device,
			LANGUAGES.map(l => l.code),
		)
		?? SOURCE_LOCALE,
	);

	private async apply(locale: Locale): Promise<void> {
		await setLocale(locale);
		document.documentElement.lang = currentLocale();
	}

	choose(locale: Locale): void {
		this.preference = locale;
		try {
			localStorage.setItem(KEY, locale);
		} catch {
			// Not remembered, but still used for this visit.
		}
	}

	/**
	Loads the language to start in. The app is mounted once this settles,
	so a translated page never flashes English first; if the language cannot
	be loaded (offline before it was ever cached), the page is in English.
	*/
	async ready(): Promise<void> {
		return this.apply(this.locale).catch(() => {
			// The page is in English.
		});
	}

	/**
	Follows the choice and the device's languages. Returns a stop function.
	*/
	start(): () => void {
		const follow = () => {
			this.device = navigator.languages ?? [navigator.language];
		};

		addEventListener('languagechange', follow);
		const stop = $effect.root(() => {
			$effect(() => {
				const {locale} = this;
				if (locale !== currentLocale()) {
					this.apply(locale).catch(() => {
						// Stays in the language it was in.
					});
				}
			});
			$effect(() => {
				document.title = `Ragnapax · ${t('app.tagline')}`;
			});
		});
		return () => {
			removeEventListener('languagechange', follow);
			stop();
		};
	}
}
