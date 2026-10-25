// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {readdirSync, readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

/**
The interface follows a soft 8 px grid: spacing between and inside elements
comes in steps of 8 px, with 4 px steps allowed below 16 px for tight spots.
"Soft" because only spacing is on the grid; borders, text and the map's own
geometry are not, so elements need not line up with grid lines.
*/
const isOnGrid = (px: number) => px % 4 === 0 && (Math.abs(px) < 16 || px % 8 === 0);

const SPACING =
	/^\s*(?:margin|padding|gap|row-gap|column-gap)(?:-[-a-z]+)?\s*:\s*(?<value>[^;]+);/gmu;

const read = (url: URL) => readFileSync(url, 'utf8');
const styleOf = (url: URL) =>
	/<style>(?<css>[\s\S]*?)<\/style>/u.exec(read(url))?.groups?.css ?? '';

const ui = new URL('./', import.meta.url);
const STYLESHEETS: Array<[string, string]> = [
	['app.css', read(new URL('../app.css', import.meta.url))],
	['App.svelte', styleOf(new URL('../App.svelte', import.meta.url))],
	...readdirSync(ui)
		.filter(f => f.endsWith('.svelte'))
		.map((f): [string, string] => [f, styleOf(new URL(f, ui))]),
];

describe('soft 8 px grid', () => {
	it.each(STYLESHEETS)('%s spaces things on the grid', (_, css) => {
		const off = [...css.matchAll(SPACING)]
			.filter(({groups}) =>
				[...groups!.value!.matchAll(/(?<px>-?\d+(?:\.\d+)?)px/gu)].some(
					match => !isOnGrid(Number(match.groups!.px)),
				),
			)
			.map(([line]) => line.trim());
		expect(off).toEqual([]);
	});
});
