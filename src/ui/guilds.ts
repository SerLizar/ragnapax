// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {VACANT, type GuildIndex} from '../domain/types.ts';

/**
How a guild's markers are outlined, so guilds can be told apart without
colour. Lengths are for a marker of radius 1 and scale with the marker.
*/
export type OutlineStyle = {
	readonly name: string;
	/**
	Visible dash and gap lengths along the outline, or undefined for a continuous line.
	*/
	readonly dash: readonly number[] | undefined;
};

export type GuildStyle = {
	/**
	Fill for markers and swatches.
	*/
	readonly fill: string;
	/**
	Text drawn on top of `fill`, black or white for at least 4.5:1 contrast.
	*/
	readonly ink: string;
	/**
	Colour of the outline, a theme token that stands out from both `fill`
	and the map.
	*/
	readonly line: string;
	readonly outline: OutlineStyle;
};

const outline = (name: string, dash: readonly number[] | undefined): OutlineStyle => ({name, dash});

/**
The four guilds' colours and outlines, in guild order. Dash lengths are
visible lengths relative to a town marker's radius; a dot is as long as the
line is wide. The colours come from the
Okabe–Ito and Paul Tol colour-blind-safe palettes and were picked to stay as
far apart as possible for protanopia, deuteranopia and tritanopia, and to
differ in lightness so they survive greyscale too. Each guild also has its
own outline, so colour is never the only cue. `accessibility.test.ts` holds
the palette to these properties.
*/
export const GUILD_STYLES: readonly GuildStyle[] = [
	{
		fill: '#cc3311', ink: '#ffffff', line: 'var(--guild-1-outline)', outline: outline('solid', undefined),
	},
	{
		fill: '#56b4e9', ink: '#1a1a1a', line: 'var(--guild-2-outline)', outline: outline('dashed', [0.62, 0.3]),
	},
	{
		fill: '#f0e442', ink: '#1a1a1a', line: 'var(--guild-3-outline)', outline: outline('dotted', [0.19, 0.3]),
	},
	{
		fill: '#332288', ink: '#ffffff', line: 'var(--guild-4-outline)', outline: outline('dash-dot', [1, 0.36, 0.19, 0.36]),
	},
];

/**
Fill opacity of markers set back from the rest: other guilds' when focusing
on one, and those that cannot be tapped. Their labels switch to the text
colour to stay readable, and their outlines the theme's outline colour.
*/
export const FADED_FILL_OPACITY = 0.35;

const VACANT_STYLE: GuildStyle = {
	fill: 'var(--vacant)',
	ink: 'var(--vacant-ink)',
	line: 'var(--vacant-stroke)',
	outline: outline('none', undefined),
};

export function guildStyle(guild: GuildIndex): GuildStyle {
	return guild === VACANT ? VACANT_STYLE : GUILD_STYLES[guild]!;
}
