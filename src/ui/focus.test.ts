// @vitest-environment happy-dom
// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
	afterEach,
	describe,
	expect,
	it,
} from 'vitest';
import {fallbackIn, keepFocus, type LostFocus} from './focus.ts';

/**
Lets the mutation observer see the latest changes.
*/
const settle = async () => new Promise(resolve => {
	setTimeout(resolve, 0);
});

function page(html: string) {
	document.body.innerHTML = html;
	const picked: Array<LostFocus<string>> = [];
	let state = 'before';
	const stop = keepFocus(document.body, {
		snapshot: () => state,
		pick(lost) {
			picked.push(lost);
			return document.querySelector<HTMLElement>('#target') ?? undefined;
		},
	});
	const get = (selector: string) => document.querySelector<HTMLElement>(selector)!;
	return {
		picked,
		stop,
		get,
		setState(next: string) {
			state = next;
		},
	};
}

let stop: (() => void) | undefined;
afterEach(() => {
	stop?.();
	document.body.replaceChildren();
});

describe('keepFocus', () => {
	it('moves focus on when the focused control is removed', async () => {
		const test = page('<section class="card"><button id="go">Go</button><button id="target">Next</button></section>');
		stop = test.stop;
		test.get('#go').focus();
		test.setState('after');
		test.get('#go').remove();
		await settle();

		expect(document.activeElement?.id).toBe('target');
		expect(test.picked).toHaveLength(1);
		expect(test.picked[0]!.snapshot).toBe('before');
		expect(test.picked[0]!.card).toBe(document.querySelector('section'));
	});

	it('moves focus on when the focused control is disabled', async () => {
		const test = page('<button id="go">Go</button><button id="target">Next</button>');
		stop = test.stop;
		test.get('#go').focus();
		(test.get('#go') as HTMLButtonElement).disabled = true;
		test.get('#go').blur();
		await settle();

		expect(document.activeElement?.id).toBe('target');
	});

	it('reports no card when the card went too', async () => {
		const test = page('<section class="card"><button id="go">Go</button></section><button id="target">Next</button>');
		stop = test.stop;
		test.get('#go').focus();
		test.get('section').remove();
		await settle();

		expect(test.picked[0]!.card).toBeUndefined();
		expect(document.activeElement?.id).toBe('target');
	});

	it('leaves focus the player moved elsewhere', async () => {
		const test = page('<button id="go">Go</button><button id="other">Other</button><button id="target">Next</button>');
		stop = test.stop;
		test.get('#go').focus();
		test.get('#other').focus();
		test.get('#go').remove();
		await settle();

		expect(document.activeElement?.id).toBe('other');
		expect(test.picked).toHaveLength(0);
	});

	it('leaves focus the player let go of', async () => {
		const test = page('<button id="go">Go</button><button id="target">Next</button>');
		stop = test.stop;
		test.get('#go').focus();
		test.get('#go').blur();
		await settle();
		test.get('#go').remove();
		await settle();

		expect(test.picked).toHaveLength(0);
	});
});

describe('fallbackIn', () => {
	it('prefers the first enabled marked control', () => {
		document.body.innerHTML = `<section class="card">
			<h2 tabindex="-1">Title</h2>
			<button data-focus-fallback disabled id="a">A</button>
			<button data-focus-fallback id="b">B</button>
		</section>`;
		expect(fallbackIn(document.querySelector('section')!)?.id).toBe('b');
	});

	it('falls back to the heading', () => {
		document.body.innerHTML = '<section class="card"><h2 tabindex="-1" id="h">Title</h2><button>Other</button></section>';
		expect(fallbackIn(document.querySelector('section')!)?.id).toBe('h');
	});
});
