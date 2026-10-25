// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// The PNG icons the site needs, drawn from public/icon.svg, the only icon
// anyone edits. The `ragna-icons` plugin in vite.config.ts serves them and
// links them from the page and the manifest; see "Icons" in docs/UI.md.

import {Buffer} from 'node:buffer';
import {createHash} from 'node:crypto';
import {Resvg} from '@resvg/resvg-js';

export type GeneratedIcon = {
	/**
	Where it is served, relative to the site's root.
	*/
	fileName: string;
	size: number;
	/**
	How it is used: a `<link>` in the page, or the manifest's purpose.
	*/
	use: 'favicon' | 'apple-touch-icon' | 'any' | 'maskable';
	png: Uint8Array;
};

/**
How much of a maskable icon the source icon covers. A maskable icon must
keep its artwork inside the central circle of 80% of its width, which the
platform may crop to; at 80%, that circle is the one inscribed in the source
icon, so artwork kept inside that circle is always safe.
*/
export const MASKABLE_SCALE = 0.8;

/**
The icon's background: the fill of its first `<rect>`, the rounded square
the artwork sits on. Icons that cannot be transparent are filled with it.
*/
export function backgroundOf(svg: string): string {
	const fill = /<rect\s[^>]*?\sfill="(?<colour>#[\da-f]{3,8})"/iu.exec(svg)?.groups?.colour;
	if (fill === undefined) {
		throw new Error('public/icon.svg needs a <rect fill="#…"> background for its opaque PNG icons.');
	}

	return fill;
}

/**
`svg` drawn `size` pixels wide. With a background, the icon is shrunk to
`scale` of the width and centred on a full square of that colour, as home
screens that crop icons to their own shape need.
*/
function render(svg: string, size: number, background?: string, scale = 1): Uint8Array {
	let source = svg;
	if (background !== undefined) {
		const inset = (size * (1 - scale)) / 2;
		const href = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
		source = [
			`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">`,
			`<rect width="${size}" height="${size}" fill="${background}"/>`,
			`<image href="${href}" x="${inset}" y="${inset}" width="${size * scale}" height="${size * scale}"/>`,
			'</svg>',
		].join('');
	}

	return new Resvg(source, {fitTo: {mode: 'width', value: size}}).render().asPng();
}

/**
Every PNG icon, named by its content so the service worker can keep a copy
across deploys until the icon changes.
*/
export function generateIcons(svg: string): GeneratedIcon[] {
	const background = backgroundOf(svg);
	const icons: Array<Omit<GeneratedIcon, 'fileName'> & {name: string}> = [
		// For browsers that ignore SVG favicons, such as Safari before 26.
		{
			name: 'icon-32', size: 32, use: 'favicon', png: render(svg, 32),
		},
		// On iOS: opaque, as it fills transparency with black, and square, as it rounds icons itself.
		{
			name: 'apple-touch-icon', size: 180, use: 'apple-touch-icon', png: render(svg, 180, background),
		},
		// Android wants PNGs of these sizes before offering to install.
		{
			name: 'icon-192', size: 192, use: 'any', png: render(svg, 192),
		},
		{
			name: 'icon-512', size: 512, use: 'any', png: render(svg, 512),
		},
		{
			name: 'icon-maskable-512',
			size: 512,
			use: 'maskable',
			png: render(svg, 512, background, MASKABLE_SCALE),
		},
	];
	return icons.map(({name, ...icon}) => ({
		...icon,
		fileName: `assets/${name}-${createHash('sha256').update(icon.png).digest('hex').slice(0, 8)}.png`,
	}));
}

/**
The `<link>` tags for the page's PNG icons, with URLs relative to it. The
PNG favicon says its size, so browsers that can use the SVG one prefer it.
*/
export function iconLinks(icons: GeneratedIcon[]): string {
	return icons
		.flatMap(({fileName, size, use}) => {
			if (use === 'favicon') {
				return [`<link href="./${fileName}" rel="icon" sizes="${size}x${size}" type="image/png">`];
			}

			return use === 'apple-touch-icon' ? [`<link href="./${fileName}" rel="apple-touch-icon">`] : [];
		})
		.join('\n\t\t');
}

/**
The web app manifest `manifest` (JSON text) with the PNG icons added after
its own.
*/
export function withManifestIcons(manifest: string, icons: GeneratedIcon[]): string {
	const parsed = JSON.parse(manifest) as {icons?: unknown[]};
	parsed.icons = [
		...parsed.icons ?? [],
		...icons
			.filter(({use}) => use === 'any' || use === 'maskable')
			.map(({fileName, size, use}) => ({
				src: fileName,
				sizes: `${size}x${size}`,
				type: 'image/png',
				purpose: use,
			})),
	];
	return `${JSON.stringify(parsed, undefined, '\t')}\n`;
}
