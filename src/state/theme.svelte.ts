// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

/**
Storage key; the start-up script in index.html reads it too.
*/
const KEY = 'ragnapax/theme';

/**
Browser chrome colour per theme; matches `--bg` in app.css.
*/
const CHROME: Record<Theme, string> = {light: '#f3f2f8', dark: '#121119'};

function load(): ThemePreference {
	try {
		const saved = localStorage.getItem(KEY);
		return saved === 'light' || saved === 'dark' ? saved : 'system';
	} catch {
		return 'system';
	}
}

/**
Light, dark or follow the system. The script in index.html applies the saved
choice before the first paint; this keeps it applied as the choice or the
system setting changes.
*/
export class ThemeState {
	private systemDark = $state(false);
	preference = $state<ThemePreference>(load());
	readonly theme: Theme = $derived(
		this.preference === 'system' ? (this.systemDark ? 'dark' : 'light') : this.preference,
	);

	choose(preference: ThemePreference): void {
		this.preference = preference;
		try {
			if (preference === 'system') {
				localStorage.removeItem(KEY);
			} else {
				localStorage.setItem(KEY, preference);
			}
		} catch {
			// Not remembered, but still applied for this visit.
		}
	}

	/**
	Applies the theme and follows the system setting. Returns a stop function.
	*/
	start(): () => void {
		const media = matchMedia('(prefers-color-scheme: dark)');
		const follow = () => {
			this.systemDark = media.matches;
		};

		follow();
		media.addEventListener('change', follow);
		const stop = $effect.root(() => {
			$effect(() => {
				document.documentElement.dataset.theme = this.theme;
				document
					.querySelector('meta[name="theme-color"]')
					?.setAttribute('content', CHROME[this.theme]);
			});
		});
		return () => {
			media.removeEventListener('change', follow);
			stop();
		};
	}
}
