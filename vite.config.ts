// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import process from 'node:process';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import {defineConfig} from 'vitest/config';

export default defineConfig({
	// Relative asset URLs so the build works from any static host sub-path.
	base: './',
	plugins: [svelte()],
	build: {
		// Baseline Widely Available, checked October 2026. It moves every month,
		// so recheck it from time to time (see "Browser support" in
		// docs/OPERATIONS.md) and keep tsconfig.json's `lib` in step.
		target: ['es2023', 'chrome123', 'edge123', 'firefox125', 'safari17.4', 'ios17.4'],
	},
	// Tests run Svelte's browser build so effects work, as in the app.
	resolve: process.env.VITEST === undefined ? undefined : {conditions: ['browser']},
	test: {
		include: ['src/**/*.test.ts'],
		testTimeout: 120_000,
	},
});
