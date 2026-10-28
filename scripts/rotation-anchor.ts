// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// Moves the anchor of the weekly map rotation (`ANCHOR_WEEK` and
// `ANCHOR_MAP_ID` in src/maps/index.ts) after a cluster change, which plays
// the last week's map again before the rotation carries on:
//
//   npm run rotation:anchor                     this Ragnarok repeats the last one's map
//   npm run rotation:anchor -- --week 2026-11-11 --map sky
//                                               the week of that date plays that map
//   npm run rotation:anchor -- --dry-run        say what would change, change nothing
//
// The week is any date in it (weeks run Wednesday to Tuesday), and the map an
// id from src/maps, the start of one, or "sky" for The Floating City. Run it
// on the Tuesday or Wednesday of the change: by default the week is the
// Ragnarok under way, or on a Tuesday the one starting the next day. It only
// edits src/maps/index.ts; the release (version, changelog) is still yours
// to make. Runs on Node's own TypeScript support (Node 26 or newer).

import {readFileSync, writeFileSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {dayOfRagnarok, ragnarokWeek, startOfWeek} from '../src/domain/calendar.ts';
import type {GameMap} from '../src/domain/map.ts';
import {DAYS} from '../src/domain/types.ts';
import {
	ANCHOR_WEEK,
	mapOfWeek,
	MAPS,
	ROTATION,
} from '../src/maps/index.ts';

const FILE = new URL('../src/maps/index.ts', import.meta.url);
const WEEK_LINE = /^export const ANCHOR_WEEK = -?\d+;$/mu;
const MAP_LINE = /^export const ANCHOR_MAP_ID = '[^']*';$/mu;

// What players call the maps, besides the start of their ids.
const NICKNAMES: Record<string, string> = {sky: 'floating-city'};

const {values} = parseArgs({
	options: {
		week: {type: 'string'},
		map: {type: 'string'},
		'dry-run': {type: 'boolean', default: false},
	},
});

function parseDate(text: string): Date {
	const {year, month, day} = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/u.exec(text)?.groups ?? {};
	const date = new Date(Number(year), Number(month) - 1, Number(day));
	// Also catches months and days that do not exist, which `Date` carries over.
	if (date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) {
		throw new Error(`--week wants a date as YYYY-MM-DD, not "${text}".`);
	}

	return date;
}

function parseMap(text: string): GameMap {
	const id = NICKNAMES[text.toLowerCase()] ?? text.toLowerCase();
	const found = MAPS.filter(map => map.id.startsWith(id));
	const match = found.length === 1 ? found[0] : found.find(map => map.id === id);
	if (!match) {
		const ids = MAPS.map(map => map.id).join(', ');
		throw new Error(`--map wants one of these maps, the start of one, or sky: ${ids}.`);
	}

	return match;
}

function upcomingWeek(): number {
	const today = new Date();
	// Tuesday only shows the last Ragnarok's results; the next starts tomorrow.
	return ragnarokWeek(today) + (dayOfRagnarok(today) > DAYS ? 1 : 0);
}

const week = values.week === undefined ? upcomingWeek() : ragnarokWeek(parseDate(values.week));

let map: GameMap;
if (values.map !== undefined) {
	map = parseMap(values.map);
} else if (week > ANCHOR_WEEK) {
	// The week before, as the rotation stands until now: the map played again.
	map = mapOfWeek(startOfWeek(week - 1));
} else {
	// Last week's map is the anchor's or before it, where the rotation may be
	// wrong; running twice would also move the rotation on a second time.
	throw new Error(`The anchor is already at week ${ANCHOR_WEEK} or later; say which map to anchor on with --map.`);
}

const dateOf = (date: Date) =>
	date.toLocaleDateString('en-GB', {
		weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
	});

const source = readFileSync(FILE, 'utf8');
if (!WEEK_LINE.test(source) || !MAP_LINE.test(source)) {
	throw new Error('Cannot find the ANCHOR_WEEK and ANCHOR_MAP_ID lines in src/maps/index.ts.');
}

const updated = source
	.replace(WEEK_LINE, () => `export const ANCHOR_WEEK = ${week};`)
	.replace(MAP_LINE, () => `export const ANCHOR_MAP_ID = '${map.id}';`);

console.log(`Anchor: week ${week}, from ${dateOf(startOfWeek(week))}, plays ${map.name}.`);
const place = ROTATION.indexOf(map);
for (let n = 1; n <= ROTATION.length; n++) {
	const next = ROTATION[(place + n) % ROTATION.length]!;
	console.log(`  then from ${dateOf(startOfWeek(week + n))}: ${next.name}`);
}

if (values['dry-run']) {
	console.log('Dry run: nothing changed.');
} else if (updated === source) {
	console.log('src/maps/index.ts already has this anchor.');
} else {
	writeFileSync(FILE, updated);
	console.log('Updated src/maps/index.ts. Release it as a patch: version, CHANGELOG.md, tests.');
}
