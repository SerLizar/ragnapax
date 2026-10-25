// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {defineConfig} from 'vitest/config';
import viteConfig from './vite.config.ts';

/**
`npm run bench`: solver benchmarks, kept out of the regular test run.
*/
export default defineConfig({
	...viteConfig,
	// Not silent: the timings table is the point of a run, and Vitest hides
	// what passing tests print.
	test: {include: ['bench/**/*.benchmark.ts'], testTimeout: 3_600_000, silent: false},
});
