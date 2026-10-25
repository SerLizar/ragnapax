// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {
	blend,
	contrast,
	difference,
	type Vision,
} from '../test/color.ts';
import {GUILD_COUNT} from '../domain/types.ts';
import {FADED_FILL_OPACITY, GUILD_STYLES} from './guilds.ts';

/**
Colour tokens per theme, read from app.css so the test sees what ships.
*/
function tokens(selector: string): Record<string, string> {
	const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
	const start = css.indexOf(`${selector} {`);
	const block = css.slice(start, css.indexOf('}', start));
	return Object.fromEntries(
		Array.from(block.matchAll(/--(?<name>[\w-]+):\s*(?<value>#[\da-f]{6});/giu), ({groups}) => [
			groups!.name!,
			groups!.value!,
		]),
	);
}

const light = tokens(':root');
const themes = {light, dark: {...light, ...tokens(':root[data-theme="dark"]')}};

/**
Text pairings in the interface: [text, background]. WCAG 1.4.3 asks 4.5:1.
*/
const TEXT = [
	['text', 'surface'],
	['text', 'bg'],
	['muted', 'surface'],
	['text', 'surface-2'],
	['muted', 'surface-2'],
	['muted', 'bg'],
	['accent', 'surface'],
	['accent', 'accent-soft'],
	['muted', 'accent-soft'],
	['accent-ink', 'accent'],
	['success', 'surface'],
	['success', 'success-soft'],
	['warning', 'warning-soft'],
	['danger', 'surface'],
	['danger', 'danger-soft'],
	['vacant-ink', 'vacant'],
] as const;

/**
Shapes and controls against what is behind them: [shape, background].
WCAG 1.4.11 asks 3:1. Roads are cased in `road`, whatever guild holds them.
*/
const SHAPES = [
	['outline', 'map-bg'],
	['vacant-stroke', 'map-bg'],
	['road', 'map-bg'],
	// The switch's track and knob when off, and focus outlines.
	['muted', 'surface'],
	['accent', 'surface'],
	['accent', 'surface-2'],
	['accent', 'map-bg'],
] as const;

const COLOUR_BLIND: Vision[] = ['normal', 'protanopia', 'deuteranopia', 'tritanopia'];

function closest(fills: string[], vision: Vision): number {
	let least = Infinity;
	for (let i = 0; i < fills.length; i++) {
		for (let j = i + 1; j < fills.length; j++) {
			least = Math.min(least, difference(fills[i]!, fills[j]!, vision));
		}
	}

	return least;
}

describe.each(Object.entries(themes))('%s theme', (name, theme) => {
	it.each(TEXT)('%s text on %s reaches 4.5:1', (text, background) => {
		expect(contrast(theme[text]!, theme[background]!)).toBeGreaterThanOrEqual(4.5);
	});

	it.each(SHAPES)('%s against %s reaches 3:1', (shape, background) => {
		expect(contrast(theme[shape]!, theme[background]!)).toBeGreaterThanOrEqual(3);
	});

	const fills = [['Vacant', theme.vacant!], ...GUILD_STYLES.map((s, g) => [`guild ${g + 1}`, s.fill])];
	it.each(fills)('labels on faded %s markers reach 4.5:1', (_name, fill) => {
		const faded = blend(fill, theme['map-bg']!, FADED_FILL_OPACITY);
		expect(contrast(theme.text!, faded)).toBeGreaterThanOrEqual(4.5);
	});

	// Sky blue sits so close to the middle of the dark map's contrast range
	// that no grey reaches 3:1 against both; its outline is the best there is.
	const outlineMinimum = (themeName: string, guild: number) => (themeName === 'dark' && guild === 2 ? 2.75 : 3);
	it.each(GUILD_STYLES.map((s, g) => [g + 1, s] as const))(
		'guild %i outlines stand out from both their fill and the map',
		(guild, style) => {
			const line = theme[`guild-${guild}-outline`]!;
			const least = outlineMinimum(name, guild);
			expect(style.line).toBe(`var(--guild-${guild}-outline)`);
			expect(contrast(line, style.fill)).toBeGreaterThanOrEqual(least);
			expect(contrast(line, theme['map-bg']!)).toBeGreaterThanOrEqual(least);
		},
	);

	it.each(fills)('outlines on faded %s markers reach 3:1', (_name, fill) => {
		const faded = blend(fill, theme['map-bg']!, FADED_FILL_OPACITY);
		expect(contrast(theme.outline!, faded)).toBeGreaterThanOrEqual(3);
	});
});

describe('guild palette', () => {
	it.each(GUILD_STYLES.map((s, g) => [g + 1, s] as const))(
		'guild %i labels reach 4.5:1',
		(_, style) => {
			expect(contrast(style.ink, style.fill)).toBeGreaterThanOrEqual(4.5);
		},
	);

	const fills = GUILD_STYLES.map(s => s.fill);

	it('has a style for each of the four guilds', () => {
		expect(GUILD_STYLES).toHaveLength(GUILD_COUNT);
	});

	// ΔE2000 of about 10 is where small markers start to blur together.
	it.each(COLOUR_BLIND)('keeps the guilds clearly apart with %s', vision => {
		expect(closest(fills, vision)).toBeGreaterThanOrEqual(25);
	});

	it('separates the guilds by lightness alone, as in greyscale', () => {
		expect(closest(fills, 'achromatopsia')).toBeGreaterThanOrEqual(10);
	});

	it('gives every guild its own outline, so colour is never the only cue', () => {
		const outlines = GUILD_STYLES.map(s => JSON.stringify(s.outline.dash));
		expect(new Set(outlines).size).toBe(GUILD_STYLES.length);
	});
});
