// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
Shows a link fragment in the address bar, in place of the current one, so
a refresh or bookmark brings it back without filling the history.
*/
export class AddressBar {
	private retry: ReturnType<typeof setTimeout> | undefined;

	show(fragment: string): void {
		clearTimeout(this.retry);
		const hash = `#${fragment}`;
		if (location.hash === hash) {
			return;
		}

		try {
			history.replaceState(null, '', location.pathname + location.search + hash);
		} catch {
			// Safari refuses too many address changes in a few seconds, which
			// fast typing or a stream of plans can reach: try again shortly.
			this.retry = setTimeout(() => {
				this.show(fragment);
			}, 1000);
		}
	}

	/**
	Drops a retry still waiting.
	*/
	stop(): void {
		clearTimeout(this.retry);
	}
}
