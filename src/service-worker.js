// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later
// @ts-check
/// <reference lib="webworker" />

// Template for dist/sw.js: the build replaces the manifest placeholder below
// with this build's files (see vite.config.ts).
//
// - The app shell is cached on install, so repeat visits load instantly and
//   work offline. The page itself comes from the cache too, even when online:
//   a weak signal would otherwise leave it blank while the request hangs. A
//   new version installs in the background and the page asks the player to
//   reload (src/state/update.svelte.ts).
// - The solver (worker and WebAssembly) is cached the first time someone
//   plans, and each translation the first time someone uses it. Both are
//   kept across deploys as long as their file names, and so their content,
//   are unchanged.
// - Anything not in the current build is deleted when a new version
//   activates, so old builds never pile up on the phone.

/**
@type {{ version: string, shell: string[], lazy: string[] }}
*/
const MANIFEST = globalThis.__MANIFEST__;
// Also in src/state/storage.ts, which deletes it on request.
const CACHE = 'ragnapax';
const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (globalThis));

const url = (/** @type {string} */ path) => new URL(path, sw.registration.scope).href;
// Worked out once: the scope cannot change while this worker runs, and the
// fetch handler checks every request the page makes against them.
const KNOWN = new Set([...MANIFEST.shell, ...MANIFEST.lazy].map(path => url(path)));
// The app's address, with or without the file name.
const PAGES = new Set([url('./'), url('./index.html')]);

sw.addEventListener('install', event => {
	event.waitUntil(
		caches
			.open(CACHE)
			// Past the HTTP cache, which may still hold the previous version's page.
			.then(async cache =>
				cache.addAll(MANIFEST.shell.map(path => new Request(url(path), {cache: 'reload'}))),
			)
			.then(() => sw.skipWaiting()),
	);
});

sw.addEventListener('activate', event => {
	event.waitUntil(
		(async () => {
			// Caches of earlier versions, such as `ragnapax-v1`. Other sites
			// can share the origin (as on GitHub Pages): theirs stay.
			const names = await caches.keys();
			await Promise.all(
				names
					.filter(name => name.startsWith(CACHE) && name !== CACHE)
					.map(async name => caches.delete(name)),
			);

			const cache = await caches.open(CACHE);
			const requests = await cache.keys();
			await Promise.all(
				requests
					.filter(request => !KNOWN.has(request.url))
					.map(async request => cache.delete(request)),
			);

			// The first tap both installs this worker and fetches the solver, so
			// the solver may already be in the browser's HTTP cache, out of
			// this worker's sight. Keep a copy, without going to the network.
			await Promise.all(
				MANIFEST.lazy.map(async path => {
					if (await cache.match(url(path))) {
						return;
					}

					try {
						const response = await fetch(url(path), {cache: 'only-if-cached', mode: 'same-origin'});
						if (response.status === 200) {
							await cache.put(url(path), response);
						}
					} catch {
						// Not in the HTTP cache: cached when next fetched.
					}
				}),
			);

			await sw.clients.claim();
		})(),
	);
});

sw.addEventListener('fetch', event => {
	const {request} = event;
	if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) {
		return;
	}

	// The page: this version's, from the cache, so it shows at once whatever
	// the connection. The network only if the cache has been cleared.
	const {origin, pathname} = new URL(request.url);
	if (request.mode === 'navigate' && PAGES.has(origin + pathname)) {
		// From this app's cache only: other sites can share the origin.
		event.respondWith(
			caches
				.open(CACHE)
				.then(async cache => cache.match(url('./')))
				.then(async page => page ?? fetch(request)),
		);
		return;
	}

	// Build files have content hashes in their names, so a cached copy is
	// always correct.
	if (!KNOWN.has(request.url)) {
		return;
	}

	event.respondWith(
		caches.open(CACHE).then(async cache => {
			const hit = await cache.match(request);
			if (hit) {
				return hit;
			}

			// Hand the response over while it downloads, so the solver's
			// WebAssembly compiles as it streams in, and cache it alongside.
			const response = await fetch(request);
			if (response.status === 200) {
				event.waitUntil(cache.put(request, response.clone()));
			}

			return response;
		}),
	);
});
