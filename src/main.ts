// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {mount} from 'svelte';
import App from './App.svelte';
import './app.css';
import {LocaleState} from './state/locale.svelte.ts';

// Mount once the player's language is in, so the page never flashes English.
const locale = new LocaleState();
void locale
	.ready()
	.then(() => mount(App, {target: document.querySelector('#app')!, props: {locale}}));

// Cache the app for instant, offline-capable repeat visits on slow networks.
// Only once the player uses it, by a tap or a key, not on a visit alone:
// storing on a device must serve something the player asked for (ePrivacy
// Directive, Art. 5(3)). A page the worker already serves keeps it updated.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
	const register = () => {
		navigator.serviceWorker.register('./sw.js').catch(() => {
			// Without it the app still works, just online only.
		});
	};

	if (navigator.serviceWorker.controller) {
		addEventListener('load', register);
	} else {
		const firstUse = () => {
			removeEventListener('pointerdown', firstUse, true);
			removeEventListener('keydown', firstUse, true);
			register();
		};

		addEventListener('pointerdown', firstUse, true);
		addEventListener('keydown', firstUse, true);
	}
}
