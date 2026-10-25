// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// Colour maths for accessibility tests: WCAG 2.2 contrast, colour-vision
// deficiency simulation (Machado, Oliveira & Fernandes 2009, full severity,
// in linear RGB) and the CIEDE2000 colour difference.

type Rgb = [number, number, number];

export type Vision = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

const parse = (hex: string): Rgb => {
	const digits = /^#(?<digits>[\da-f]{6})$/iu.exec(hex)?.groups?.digits;
	if (digits === undefined) {
		throw new Error(`Not a #rrggbb colour: ${hex}`);
	}

	return [0, 2, 4].map(i => Number.parseInt(digits.slice(i, i + 2), 16) / 255) as Rgb;
};

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linear = (hex: string) => parse(hex).map(c => toLinear(c)) as Rgb;
const luminance = ([r, g, b]: Rgb) => (0.2126 * r) + (0.7152 * g) + (0.0722 * b);

/**
`hex` drawn at `opacity` over `background`, as browsers blend it (in sRGB).
*/
export function blend(hex: string, background: string, opacity: number): string {
	const top = parse(hex);
	const bottom = parse(background);
	return `#${top
		.map((c, i) => Math.round(((c * opacity) + (bottom[i]! * (1 - opacity))) * 255)
			.toString(16)
			.padStart(2, '0'))
		.join('')}`;
}

/**
WCAG contrast ratio, from 1 to 21.
*/
export function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(linear(a)), luminance(linear(b))].toSorted((x, y) => y - x);
	return (hi! + 0.05) / (lo! + 0.05);
}

const MACHADO: Record<'protanopia' | 'deuteranopia' | 'tritanopia', number[][]> = {
	protanopia: [
		[0.152286, 1.052583, -0.204868],
		[0.114503, 0.786281, 0.099216],
		[-0.003882, -0.048116, 1.051998],
	],
	deuteranopia: [
		[0.367322, 0.860646, -0.227968],
		[0.280085, 0.672501, 0.047413],
		[-0.01182, 0.04294, 0.968881],
	],
	tritanopia: [
		[1.255528, -0.076749, -0.178779],
		[-0.078411, 0.930809, 0.147602],
		[0.004733, 0.691367, 0.3039],
	],
};

/**
How a colour looks with a colour-vision deficiency, in linear RGB.
*/
function seen(hex: string, vision: Vision): Rgb {
	const c = linear(hex);
	if (vision === 'normal') {
		return c;
	}

	if (vision === 'achromatopsia') {
		const y = luminance(c);
		return [y, y, y];
	}

	return MACHADO[vision].map(row =>
		Math.min(1, Math.max(0, (row[0]! * c[0]) + (row[1]! * c[1]) + (row[2]! * c[2]))),
	) as Rgb;
}

function lab([r, g, b]: Rgb): Rgb {
	const x = ((0.4124 * r) + (0.3576 * g) + (0.1805 * b)) / 0.95047;
	const y = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
	const z = ((0.0193 * r) + (0.1192 * g) + (0.9505 * b)) / 1.08883;
	const f = (t: number) => (t > 216 / 24_389 ? Math.cbrt(t) : (((24_389 / 27) * t) / 116) + (16 / 116));
	return [(116 * f(y)) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (((r * 180) / Math.PI) + 360) % 360;

/**
CIEDE2000 difference between two colours as seen with the given vision.
*/
export function difference(a: string, b: string, vision: Vision = 'normal'): number {
	const [L1, a1, b1] = lab(seen(a, vision));
	const [L2, a2, b2] = lab(seen(b, vision));
	const Cbar = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
	const G = 0.5 * (1 - Math.sqrt((Cbar ** 7) / ((Cbar ** 7) + (25 ** 7))));
	const [a1p, a2p] = [a1 * (1 + G), a2 * (1 + G)];
	const [C1, C2] = [Math.hypot(a1p, b1), Math.hypot(a2p, b2)];
	const [h1, h2] = [deg(Math.atan2(b1, a1p)), deg(Math.atan2(b2, a2p))];
	let dh = h2 - h1;
	if (C1 * C2 === 0) {
		dh = 0;
	} else if (dh > 180) {
		dh -= 360;
	} else if (dh < -180) {
		dh += 360;
	}

	const dH = 2 * Math.sqrt(C1 * C2) * Math.sin(rad(dh / 2));
	const Lbar = (L1 + L2) / 2;
	const Cpbar = (C1 + C2) / 2;
	const turn = h1 + h2 < 360 ? 360 : -360;
	const hbar = C1 * C2 === 0 ? h1 + h2 : (h1 + h2 + (Math.abs(h1 - h2) <= 180 ? 0 : turn)) / 2;
	const T =
		1
		- (0.17 * Math.cos(rad(hbar - 30)))
		+ (0.24 * Math.cos(rad(2 * hbar)))
		+ (0.32 * Math.cos(rad((3 * hbar) + 6)))
		- (0.2 * Math.cos(rad((4 * hbar) - 63)));
	const Sl = 1 + ((0.015 * ((Lbar - 50) ** 2)) / Math.sqrt(20 + ((Lbar - 50) ** 2)));
	const Sc = 1 + (0.045 * Cpbar);
	const Sh = 1 + (0.015 * Cpbar * T);
	const Rt =
		-2
		* Math.sqrt((Cpbar ** 7) / ((Cpbar ** 7) + (25 ** 7)))
		* Math.sin(rad(60 * Math.exp(-(((hbar - 275) / 25) ** 2))));
	const [l, c, h] = [(L2 - L1) / Sl, (C2 - C1) / Sc, dH / Sh];
	return Math.sqrt((l * l) + (c * c) + (h * h) + (Rt * c * h));
}
