// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {compileMap, type GameMap} from '../domain/map.ts';
import {simulate, startingOwnership, type Plan} from '../domain/plan.ts';
import {DEFAULT_MAP as map, MAP_DEFINITIONS} from '../maps/index.ts';
import {FLOATING_CITY_START} from '../test/fixtures.ts';
import {
	decodeShareLink,
	encodeShareLink,
	ShareLinkError,
	type SharedPlan,
} from './link.ts';
import {forChat, planToText} from './text.ts';

const idx = (id: string) => map.indexOf(id)!;
const idle = () => [[], [], [], []] as number[][];
const plan: Plan = {
	declarations: [
		[[idx('Vagastrom'), idx('Dionysia')], [], [idx('Hotarubi'), idx('Jabberwock')], []],
		[[], [idx('Vagastrom')], [], [idx('Mortkranken')]],
		idle(),
		idle(),
		idle(),
		idle(),
	],
};
/**
The same plan on a copy of the map whose kingdoms are numbered otherwise.
*/
const renumbered = ({declarations}: Plan, to: GameMap): Plan => ({
	declarations: declarations.map(day =>
		day.map(targets => targets.map(t => to.indexOf(map.kingdoms[t]!.id)!)),
	),
});
const shared: SharedPlan = {
	map,
	guildNames: ['Day&Night', 'Blue=Moon', 'Ünïcode ✨', 'Guild 4'],
	startingTowns: FLOATING_CITY_START,
	goal: 'resources',
	fillMap: true,
	castleLast: false,
	played: [],
	plan,
	received: false,
};

describe('share links', () => {
	it('round-trip a plan, names included', () => {
		expect(decodeShareLink('#' + encodeShareLink(shared))).toEqual(shared);
	});

	it('round-trip days already played, keeping the plan after them', () => {
		const replanned = {...shared, played: plan.declarations.slice(0, 2)};
		const link = encodeShareLink(replanned);
		expect(link).toContain('&h=');
		expect(decodeShareLink(link)).toEqual(replanned);
		// The plan only lists the days after those played.
		expect(new URLSearchParams(link).get('p')!.split('-')).toHaveLength(4);
	});

	it('round-trip days already played without a plan', () => {
		const setup = {...shared, played: plan.declarations.slice(0, 1), plan: undefined};
		expect(decodeShareLink(encodeShareLink(setup))).toEqual(setup);
	});

	it('round-trip a setup that is still being filled in', () => {
		const partial = {...shared, startingTowns: {A: 0, B: 2}, plan: undefined};
		expect(decodeShareLink(encodeShareLink(partial))).toEqual(partial);
	});

	it('round-trip a setup without a plan', () => {
		const setup = {...shared, plan: undefined};
		expect(decodeShareLink(encodeShareLink(setup))).toEqual(setup);
	});

	it('round-trip extra castle-days going to the last guilds', () => {
		const castleLast = {...shared, castleLast: true};
		expect(new URLSearchParams(encodeShareLink(castleLast)).get('c')).toBe('1');
		expect(decodeShareLink(encodeShareLink(castleLast))).toEqual(castleLast);
		// Links from before the setting hand them to the first guilds.
		expect(new URLSearchParams(encodeShareLink(shared)).has('c')).toBe(false);
	});

	it('round-trip the mark of a plan sent to someone else', () => {
		const sent = {...shared, received: true};
		expect(encodeShareLink(sent)).toMatch(/&s=1$/u);
		expect(decodeShareLink(encodeShareLink(sent))).toEqual(sent);
	});

	it('leave the player\'s own links unmarked', () => {
		expect(decodeShareLink(encodeShareLink(shared))?.received).toBe(false);
		expect(encodeShareLink(shared)).not.toMatch(/&s=/u);
	});

	it('depend on kingdom ids, not the order a map file lists them in', () => {
		const reversed = compileMap({
			...MAP_DEFINITIONS[0]!,
			kingdoms: MAP_DEFINITIONS[0]!.kingdoms.toReversed(),
		});
		const same = {...shared, map: reversed, plan: renumbered(plan, reversed)};
		expect(encodeShareLink(same)).toBe(encodeShareLink(shared));
	});

	it('stay short enough to paste in chat', () => {
		expect(encodeShareLink({...shared, guildNames: ['A', 'B', 'C', 'D']}).length).toBeLessThan(120);
	});

	it('ignore fragments that are not share links', () => {
		expect(decodeShareLink('')).toBeUndefined();
		expect(decodeShareLink('#top')).toBeUndefined();
	});

	const problem = (fragment: string) => {
		try {
			decodeShareLink(fragment);
		} catch (error) {
			if (error instanceof ShareLinkError) {
				return error.problem;
			}

			throw error;
		}
	};

	it.each([
		['v=9&m=floating-city', 'newer'],
		['v=0&m=floating-city', 'older'],
		['v=&m=floating-city', 'damaged'],
		['v=abc&m=floating-city', 'damaged'],
		['v=1.0&m=floating-city', 'damaged'],
		['v=1&m=atlantis&o=p', 'map'],
		['v=1&m=floating-city&o=x', 'goal'],
		['v=1&m=floating-city&o=p&t=123', 'towns'],
		['v=1&m=floating-city&o=p&t=11111222233334440&p=...-...-...-...-...-...', 'townRules'],
	])('reject %s', (fragment, expected) => {
		expect(problem(fragment)).toBe(expected);
	});

	it('reject plans that break the rules, saying which rule', () => {
		const cheat = encodeShareLink({
			...shared,
			plan: {
				declarations: [[[idx('Darkwick')], [], [], []], ...plan.declarations.slice(1)],
			},
		});
		expect(problem(cheat)).toBe('rules');
		expect(problem(cheat.replace(/&p=[^&]*/u, '&p=~'))).toBe('plan');
	});

	it('count a kingdom listed twice for one guild as one declare', () => {
		const link = new URLSearchParams(encodeShareLink(shared));
		const days = link.get('p')!;
		const twice = days.slice(0, 1) + days;
		link.set('p', twice);
		expect(decodeShareLink(link.toString())?.plan).toEqual(plan);
	});

	it('trim guild names, and cut them to the game\'s 9 characters', () => {
		const untidy = {
			...shared,
			guildNames: [' Owls ', 'Nightowls of the north', ' '.repeat(3), 'x'.repeat(8) + ' y'],
		};
		expect(encodeShareLink(untidy)).toContain('g=Owls&');
		expect(decodeShareLink(encodeShareLink(untidy))?.guildNames).toEqual([
			'Owls',
			'Nightowls',
			'',
			'x'.repeat(8),
		]);
		expect(decodeShareLink(encodeShareLink(shared).replace('g=', 'g=+'))?.guildNames[0]).toBe(
			'Day&Night',
		);
	});

	it('count characters as players see them in guild names', () => {
		// Each a single character on screen, made of several code points.
		const of = (...points: number[]) => String.fromCodePoint(...points);
		const family = of(0x1_F4_68, 0x20_0D, 0x1_F4_69, 0x20_0D, 0x1_F4_67);
		const flag = of(0x1_F1_EF, 0x1_F1_F5);
		const accented = of(0x65, 0x3_01);
		const kanji = '東京デバンカーズの夜明け';
		const names = [family, flag, accented].map(c => c.repeat(10));
		expect(
			decodeShareLink(encodeShareLink({...shared, guildNames: [...names, kanji]}))?.guildNames,
		).toEqual([family.repeat(9), flag.repeat(9), accented.repeat(9), '東京デバンカーズの']);
	});

	it('drop hidden characters that could disguise a guild name', () => {
		const link = new URLSearchParams(encodeShareLink(shared));
		const [reverse, isolate, newline, bell] = [0x20_2E, 0x20_66, 0x0A, 0x07].map(c =>
			String.fromCodePoint(c));
		link.set('g', `${reverse}evil${isolate}${newline} Owls${bell}`);
		expect(decodeShareLink(link.toString())?.guildNames[0]).toBe('evil Owls');
	});

	it('reject played days that break the rules, or leave nothing to plan', () => {
		const cheat = {
			...shared,
			played: [[[idx('Darkwick')], [], [], []]],
			plan: undefined,
		};
		expect(problem(encodeShareLink(cheat))).toBe('rules');
		expect(problem(encodeShareLink({...shared, played: plan.declarations, plan: undefined}))).toBe(
			'plan',
		);
		expect(
			problem(encodeShareLink({
				...shared, startingTowns: {A: 0}, played: [[]], plan: undefined,
			})),
		).toBe('townRules');
	});

	it('leave blank guild names blank, for the reader\'s language to fill in', () => {
		const blank = {...shared, guildNames: ['', 'Beta', '', '']};
		expect(decodeShareLink(encodeShareLink(blank))?.guildNames).toEqual(blank.guildNames);
	});
});

describe('planToText', () => {
	const timeline = simulate(map, startingOwnership(map, FLOATING_CITY_START), plan);
	const guildNames = ['Alpha', 'Beta', 'Gamma', 'Delta'];

	it('lists every guild\'s declarations per day', () => {
		const text = planToText({
			map, guildNames, goal: 'points', fillMap: false, castleLast: false, timeline,
		});
		expect(text.split('\n').slice(0, 12)).toEqual([
			'The Floating City · Equal points',
			'',
			'Wednesday',
			'• Alpha: Vagastrom, Dionysia',
			'• Beta: no declares',
			'• Gamma: Hotarubi, Jabberwock',
			'• Delta: no declares',
			'',
			'Thursday',
			'• Alpha: no declares',
			'• Beta: Vagastrom (from Alpha)',
			'• Gamma: no declares',
		]);
	});

	it('can focus on one guild', () => {
		const text = planToText({
			map,
			guildNames,
			goal: 'points',
			fillMap: false,
			castleLast: false,
			timeline,
			guild: 1,
		});
		expect(text).toContain('Declares for Beta');
		expect(text).toContain('Thursday\n• Vagastrom (from Alpha)');
		expect(text).not.toContain('Gamma');
	});

	it('keeps guild names from formatting or pinging anyone in Discord', () => {
		const text = planToText({
			map,
			guildNames: ['@everyone', '**Bold**', 'x_y', 'Delta'],
			goal: 'points',
			fillMap: false,
			castleLast: false,
			timeline,
		});
		expect(text).toContain(String.raw`• \@everyone: Vagastrom, Dionysia`);
		expect(text).toContain(String.raw`Vagastrom (from \@everyone)`);
		expect(text).toContain(String.raw`• \*\*Bold\*\*: no declares`);
		expect(text).toContain(String.raw`• x\_y: Hotarubi, Jabberwock`);
		expect(text).toContain('Delta');
	});

	it('mentions when every kingdom is used', () => {
		const text = planToText({
			map, guildNames, goal: 'resources', fillMap: true, castleLast: false, timeline,
		});
		expect(text.split('\n', 1)[0]).toBe('The Floating City · Equal resources · Use every kingdom');
	});

	it('mentions when extra castle days go last, only while every kingdom is used', () => {
		const title = (isFillMap: boolean) => planToText({
			map, guildNames, goal: 'resources', fillMap: isFillMap, castleLast: true, timeline,
		}).split('\n', 1)[0];
		expect(title(true)).toBe(
			'The Floating City · Equal resources · Use every kingdom · Extra castle days last',
		);
		expect(title(false)).toBe('The Floating City · Equal resources');
	});
});

describe('forChat', () => {
	it('escapes what Discord reads as formatting, links or mentions', () => {
		expect(forChat('@here')).toBe(String.raw`\@here`);
		expect(forChat(String.raw`a\b`)).toBe(String.raw`a\\b`);
		expect(forChat('~~|`<[x]>`|~~')).toBe(String.raw`\~\~\|\`\<\[x\]>\`\|\~\~`);
	});

	it('leaves ordinary names as they are', () => {
		for (const name of ['Owls', 'Day&Night', 'Ünïcode ✨', '東京', 'Blue=Moon']) {
			expect(forChat(name)).toBe(name);
		}
	});
});
