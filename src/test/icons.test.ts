// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// The PNG icons drawn from public/icon.svg, as "Icons" in docs/UI.md
// describes them: home screens that crop or fill icons get what they need.

import {Buffer} from 'node:buffer';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {describe, expect, it} from 'vitest';
import {
	backgroundOf,
	generateIcons,
	iconLinks,
	withManifestIcons,
	type GeneratedIcon,
} from '../../scripts/icons.ts';

const root = join(import.meta.dirname, '../..');
const svg = readFileSync(join(root, 'public/icon.svg'), 'utf8');
const icons = generateIcons(svg);
const byUse = (use: GeneratedIcon['use']) => icons.filter(icon => icon.use === use);

/**
The RGBA pixels of a PNG, decoded by drawing it at its own size.
*/
function pixelsOf({png, size}: GeneratedIcon): Uint8Array {
	const href = `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
	const page = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><image href="${href}" width="${size}" height="${size}"/></svg>`;
	const image = new Resvg(page).render();
	expect(image.width).toBe(size);
	return image.pixels;
}

/**
How far the pixel at `at` is from `colour` (#rrggbb): the largest difference
in any channel.
*/
function distance(pixels: Uint8Array, at: number, colour: string): number {
	return Math.max(
		...[0, 1, 2].map(channel =>
			Math.abs(pixels[at + channel]! - Number.parseInt(colour.slice(1 + (2 * channel), 3 + (2 * channel)), 16)),
		),
	);
}

describe('the PNG icons', () => {
	it('include a favicon, an Apple touch icon, and manifest icons for every purpose', () => {
		expect(byUse('favicon')).toHaveLength(1);
		expect(byUse('apple-touch-icon').map(({size}) => size)).toEqual([180]);
		expect(byUse('any').map(({size}) => size)).toEqual([192, 512]);
		expect(byUse('maskable').map(({size}) => size)).toEqual([512]);
	});

	it.each(icons)('$fileName is a PNG named after its content', ({fileName, png}) => {
		expect([...png.subarray(1, 4)]).toEqual([0x50, 0x4E, 0x47]);
		expect(fileName).toMatch(/^assets\/[\w-]+-[\da-f]{8}\.png$/u);
	});

	it.each([...byUse('apple-touch-icon'), ...byUse('maskable')])(
		'$fileName is opaque, as iOS and maskable icons must be',
		icon => {
			const pixels = pixelsOf(icon);
			const transparent = pixels.filter((_, i) => i % 4 === 3 && pixels[i] !== 255);
			expect(transparent.length).toBe(0);
		},
	);

	it.each(byUse('maskable'))('$fileName keeps its artwork inside the safe zone', icon => {
		// Outside the central circle of 80% of the width, platforms may crop:
		// there must be only background there. The edge of the source icon's
		// rounded square, antialiased over the same colour, may be a shade off.
		const background = backgroundOf(svg);
		expect(background).toMatch(/^#[\da-f]{6}$/iu);
		const pixels = pixelsOf(icon);
		const centre = icon.size / 2;
		let furthest = 0;
		let checked = 0;
		for (let y = 0; y < icon.size; y++) {
			for (let x = 0; x < icon.size; x++) {
				if (!(Math.hypot(x + 0.5 - centre, y + 0.5 - centre) > 0.4 * icon.size)) {
					continue;
				}

				checked++;
				furthest = Math.max(furthest, distance(pixels, ((y * icon.size) + x) * 4, background));
			}
		}

		expect(checked).toBeGreaterThan(0);
		expect(furthest).toBeLessThanOrEqual(2);
	});

	it('are linked from the page, the PNG favicon with its size', () => {
		const links = iconLinks(icons);
		const [favicon] = byUse('favicon');
		const [touch] = byUse('apple-touch-icon');
		expect(links).toContain(`href="./${favicon!.fileName}" rel="icon" sizes="32x32" type="image/png"`);
		expect(links).toContain(`href="./${touch!.fileName}" rel="apple-touch-icon"`);
	});

	it('are added to the manifest after its SVG icon', () => {
		const source = readFileSync(join(root, 'public/manifest.webmanifest'), 'utf8');
		const manifest = JSON.parse(withManifestIcons(source, icons)) as {icons: Array<{src: string; purpose?: string}>};
		expect(manifest.icons.map(({src, purpose}) => [src, purpose ?? 'any'])).toEqual([
			['icon.svg', 'any'],
			...[...byUse('any'), ...byUse('maskable')].map(({fileName, use}) => [fileName, use]),
		]);
	});
});
