// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {PlanQuality} from '../solver/solve.ts';

/**
Where a plan came from and, for one the solver just made, how good it is
known to be. Quality only matters while planning, so it is never saved:
a plan brought back from this device is `saved`, one someone else sent is
`shared`, and both have been checked against the rules.
*/
export type ResultQuality = PlanQuality | 'saved' | 'shared';

/**
What is remembered: each map's setup and plan, as a share link, so saved
data goes through the same validation as links from others and there is a
single serialisation format to maintain.
*/
type Saved = {
	readonly maps: Readonly<Record<string, string>>;
};

const KEY = 'ragnapax/v1';

export function loadSaved(): Saved {
	try {
		const {maps} = JSON.parse(localStorage.getItem(KEY) ?? '{}') as {maps?: unknown};
		// Anything but a link per map was written by another version.
		const links = Object.entries(maps ?? {}).filter(
			(entry): entry is [string, string] => typeof entry[1] === 'string',
		);
		return {maps: Object.fromEntries(links)};
	} catch {
		return {maps: {}}; // Storage blocked or corrupt: start fresh
	}
}

export function saveMap(mapId: string, link: string): void {
	const saved = loadSaved();
	try {
		localStorage.setItem(
			KEY,
			JSON.stringify({maps: {...saved.maps, [mapId]: link}}),
		);
	} catch {
		// Private browsing or a full quota: the setup just is not remembered.
	}
}

const TOWN_LISTS_KEY = 'ragnapax/town-lists';

/**
Whether the player sets starting towns from lists rather than on the map.
A preference of the player's own, for every map, kept on the device and
out of links: guilds in the same group may set up differently.
*/
export function areTownListsChosen(): boolean {
	try {
		return localStorage.getItem(TOWN_LISTS_KEY) === 'on';
	} catch {
		return false; // Storage blocked: the map, as by default
	}
}

export function saveTownLists(isOn: boolean): void {
	try {
		if (isOn) {
			localStorage.setItem(TOWN_LISTS_KEY, 'on');
		} else {
			localStorage.removeItem(TOWN_LISTS_KEY);
		}
	} catch {
		// Not remembered, but still used for this visit.
	}
}

/**
Saves a map's setup a moment after the last change rather than on every
one: a name being typed, or a stream of plans from the solver, would
otherwise write storage many times a second, which costs a slow phone.
*/
export class DelayedSave {
	private pending:
		| {readonly mapId: string; readonly link: string; readonly timer: ReturnType<typeof setTimeout>}
		| undefined;

	constructor(private readonly delayMs = 500) {}

	/**
	Saves `link` for `mapId` once nothing has changed for a moment. A save
	still waiting for another map is made at once, so it is not lost.
	*/
	save(mapId: string, link: string): void {
		if (this.pending?.mapId !== mapId) {
			this.flush();
		}

		this.drop();
		this.pending = {
			mapId,
			link,
			timer: setTimeout(() => {
				this.flush();
			}, this.delayMs),
		};
	}

	/**
	Makes the save still waiting, if any, at once: before the page is hidden
	or closed, which may be the last chance.
	*/
	flush(): void {
		const {pending} = this;
		this.drop();
		if (pending) {
			saveMap(pending.mapId, pending.link);
		}
	}

	/**
	Forgets the save still waiting, if any, as when deleting everything.
	*/
	drop(): void {
		clearTimeout(this.pending?.timer);
		this.pending = undefined;
	}
}

/**
Every key the app has ever written starts with this, the theme's, the
language's and other choices' included, so deleting everything needs no
list to keep up to date.
*/
const PREFIX = 'ragnapax/';

/**
The service worker's cache, as named in `src/service-worker.js`.
*/
const OFFLINE_CACHE = 'ragnapax';

/**
Deletes everything the app saved on this device: setups, plans, choices
such as the theme and language, and the offline copy of the planner. The privacy
notice offers it.
*/
export async function forgetAll(): Promise<void> {
	try {
		const keys = Array.from({length: localStorage.length}, (_, i) => localStorage.key(i));
		for (const key of keys) {
			if (key?.startsWith(PREFIX)) {
				localStorage.removeItem(key);
			}
		}
	} catch {
		// Storage blocked: nothing was saved.
	}

	// Other sites can share the origin (as on GitHub Pages), so only this
	// app's own worker and cache go.
	try {
		const registration = await globalThis.navigator?.serviceWorker?.getRegistration();
		if (registration?.scope === new URL('./', location.href).href) {
			await registration.unregister();
		}

		await globalThis.caches?.delete(OFFLINE_CACHE);
	} catch {
		// Storage blocked: nothing was cached.
	}
}
