// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import process from 'node:process';
import {defineConfig, devices} from '@playwright/test';

const isCi = Boolean(process.env.CI);

/**
End-to-end tests drive the production build (service worker, content
security policy and all) on phones from about five years ago: an Android
phone in Chromium and an iPhone in WebKit, Safari's engine and the one that
sets the browser target (see "Browser support" in docs/OPERATIONS.md).
*/
export default defineConfig({
	testDir: 'e2e',
	timeout: 90_000,
	fullyParallel: true,
	forbidOnly: isCi,
	retries: isCi ? 1 : 0,
	// On CI, also an HTML report, kept when tests fail (see ci.yml).
	reporter: isCi ? [['github'], ['html', {open: 'never'}]] : 'list',
	// eslint-disable-next-line @typescript-eslint/naming-convention -- Playwright's option name
	use: {baseURL: 'http://localhost:4173', trace: 'retain-on-failure'},
	projects: [
		{name: 'android', use: {...devices['Pixel 5']}},
		{name: 'iphone', use: {...devices['iPhone 13']}},
	],
	webServer: {
		// CI builds first and deploys that same build, so it is only served
		// here; locally every run builds afresh.
		command: `${isCi ? '' : 'npm run build && '}npx vite preview --port 4173 --strictPort`,
		// Builds need to know their source code; a test build is never
		// published, so an address that cannot resolve will do.
		env: {
			// eslint-disable-next-line @typescript-eslint/naming-convention -- an environment variable
			SOURCE_URL:
				process.env.SOURCE_URL
				?? ((process.env.GITHUB_REPOSITORY ?? '') === ''
					? 'https://source-url.invalid/ragnapax'
					: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`),
		},
		url: 'http://localhost:4173',
		reuseExistingServer: !isCi,
		timeout: 120_000,
	},
});
