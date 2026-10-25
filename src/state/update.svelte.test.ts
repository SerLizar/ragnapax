// @vitest-environment happy-dom
// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {UpdateState} from './update.svelte.ts';

/**
Stands in for `navigator.serviceWorker`, counting update checks.
*/
class FakeContainer extends EventTarget {
	updates = 0;

	constructor(public controller: Record<string, unknown> | undefined) {
		super();
	}

	async getRegistration() {
		return {
			update: async () => {
				this.updates++;
			},
		};
	}

	takeOver(): void {
		this.controller = {};
		this.dispatchEvent(new Event('controllerchange'));
	}
}

const watch = (container: FakeContainer) => {
	const update = new UpdateState(container as unknown as ServiceWorkerContainer);
	const stop = update.start();
	return {update, stop};
};

describe('UpdateState', () => {
	it('asks for a reload when a new version takes over', () => {
		const container = new FakeContainer({});
		const {update, stop} = watch(container);
		expect(update.available).toBe(false);
		container.takeOver();
		expect(update.available).toBe(true);
		stop();
	});

	it('ignores the first service worker taking control on a first visit', () => {
		const container = new FakeContainer(undefined);
		const {update, stop} = watch(container);
		container.takeOver();
		expect(update.available).toBe(false);
		container.takeOver();
		expect(update.available).toBe(true);
		stop();
	});

	it('looks for a new version when the page comes back into view', async () => {
		const container = new FakeContainer({});
		const {stop} = watch(container);
		document.dispatchEvent(new Event('visibilitychange'));
		await new Promise(resolve => {
			setTimeout(resolve, 0);
		});
		expect(container.updates).toBe(1);
		stop();
	});

	it('does nothing without a service worker', () => {
		const update = new UpdateState(undefined);
		const stop = update.start();
		update.check();
		expect(update.available).toBe(false);
		stop();
	});
});
