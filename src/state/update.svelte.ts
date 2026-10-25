// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
Notices when a new version of the planner replaces the one this page was
loaded from. The new version's service worker deletes the old version's
files, so this page can no longer fetch the solver or a translation it has
not used yet: the player has to reload. See "Offline and caching" in
docs/OPERATIONS.md.
*/
export class UpdateState {
	/**
	Whether some version already controls the page. On a first visit the
	service worker takes control as well, but nothing is out of date then.
	*/
	private isControlled: boolean;
	/**
	True once a new version has taken over; the page should be reloaded.
	*/
	available = $state(false);

	constructor(private readonly container = globalThis.navigator?.serviceWorker) {
		this.isControlled = Boolean(container?.controller);
	}

	/**
	Asks the browser to look for a new version now, rather than at the next
	visit. A new version installs and takes over at once, which `start`
	notices. Does nothing offline or without a service worker.
	*/
	check(): void {
		void this.container
			?.getRegistration()
			.then(async registration => registration?.update())
			.catch(() => {
				// Offline: the next check will find it.
			});
	}

	/**
	Watches for a new version, checking whenever the page comes back into
	view: players switch to the game and back while a plan is in use, and a
	tab can stay open for days. Returns a stop function.
	*/
	start(): () => void {
		const changed = () => {
			if (this.isControlled) {
				this.available = true;
			}

			this.isControlled = true;
		};

		const visible = () => {
			if (document.visibilityState === 'visible') {
				this.check();
			}
		};

		this.container?.addEventListener('controllerchange', changed);
		document.addEventListener('visibilitychange', visible);
		return () => {
			this.container?.removeEventListener('controllerchange', changed);
			document.removeEventListener('visibilitychange', visible);
		};
	}

	reload(): void {
		location.reload();
	}
}
