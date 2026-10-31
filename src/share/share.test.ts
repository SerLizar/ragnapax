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
	inactive: [],
	fewestDays: false,
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

	it('round-trip declaring on the fewest days', () => {
		const fewestDays = {...shared, fewestDays: true};
		expect(new URLSearchParams(encodeShareLink(fewestDays)).get('d')).toBe('1');
		expect(decodeShareLink(encodeShareLink(fewestDays))).toEqual(fewestDays);
		// Links from before the setting make the fewest declares.
		expect(new URLSearchParams(encodeShareLink(shared)).has('d')).toBe(false);
	});

	it('round-trip holdings set by hand, keeping the switches they replace', () => {
		const setup = {
			...shared,
			targets: [
				{town: 25, dormitory: 10, castle: 1},
				{town: 30, dormitory: 0, castle: 6},
				{town: 0, dormitory: 42, castle: 0},
				{town: 102, dormitory: 9, castle: 2},
			],
		};
		expect(new URLSearchParams(encodeShareLink(setup)).get('k')).toBe('25.10.1-30.0.6-0.42.0-102.9.2');
		expect(decodeShareLink(encodeShareLink(setup))).toEqual(setup);
		// Links from before holdings could be set share by the goal.
		expect(new URLSearchParams(encodeShareLink(shared)).has('k')).toBe(false);
		expect(decodeShareLink(encodeShareLink(shared))?.targets).toBeUndefined();
	});

	it('round-trip the guilds sitting out', () => {
		const setup = {...shared, inactive: [1, 3], plan: undefined};
		expect(new URLSearchParams(encodeShareLink(setup)).get('i')).toBe('24');
		expect(decodeShareLink(encodeShareLink(setup))).toEqual(setup);
		// Links from before guilds could sit out have every guild playing.
		expect(new URLSearchParams(encodeShareLink(shared)).has('i')).toBe(false);
	});

	it('read the guilds sitting out in guild order, each once', () => {
		const link = new URLSearchParams(encodeShareLink({...shared, plan: undefined}));
		link.set('i', '424');
		expect(decodeShareLink(link.toString())?.inactive).toEqual([1, 3]);
	});

	it('open plans that disturb a guild sitting out: rude, but not against the rules', () => {
		// Guild 1 declares on Wednesday; guild 2 takes Vagastrom from it on Thursday.
		const rude = {...shared, inactive: [0]};
		expect(decodeShareLink(encodeShareLink(rude))).toEqual(rude);
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

	it('write spaces in guild names as %20, which chat apps leave alone', () => {
		const spaced = {...shared, guildNames: ['Gato Zanh', 'C++ Club', 'Blue Moon', '']};
		const link = encodeShareLink(spaced);
		expect(link).toContain('g=Gato%20Zanh&g=C%2B%2B%20Club&');
		expect(link).not.toContain('+');
		expect(decodeShareLink(link)?.guildNames).toEqual(spaced.guildNames);
	});

	it('still read links written with + for spaces', () => {
		const link = encodeShareLink({...shared, guildNames: ['Gato Zanh', '', '', '']});
		expect(decodeShareLink(link.replace('%20', '+'))?.guildNames[0]).toBe('Gato Zanh');
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
		['v=1&m=floating-city&o=p&i=5&t=11112222333344440', 'damaged'],
		['v=1&m=floating-city&o=p&i=x&t=11112222333344440', 'damaged'],
		['v=1&m=floating-city&o=p&i=4321&t=11112222333344440', 'damaged'],
		// Holdings set by hand: three guilds, a missing kind, a fraction, and
		// more castle-days than a week has.
		['v=1&m=floating-city&o=p&k=25.10.1-25.10.1-25.10.1&t=11112222333344440', 'damaged'],
		['v=1&m=floating-city&o=p&k=25.10.1-25.10.1-25.10.1-25.10&t=11112222333344440', 'damaged'],
		['v=1&m=floating-city&o=p&k=25.10.1-25.10.1-25.10.1-25.10.1.5&t=11112222333344440', 'damaged'],
		['v=1&m=floating-city&o=p&k=25.10.1-25.10.1-25.10.1-25.10.7&t=11112222333344440', 'damaged'],
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
			map, guildNames, goal: 'points', fillMap: false, castleLast: false, inactive: [], fewestDays: false, timeline,
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

	it('names the guilds sitting out once, and leaves them out of the days and points', () => {
		const text = planToText({
			map, guildNames, goal: 'points', fillMap: false, castleLast: false, inactive: [1], fewestDays: false, timeline,
		});
		expect(text.split('\n').slice(0, 13)).toEqual([
			'The Floating City · Equal points',
			'Sitting out: Beta',
			'',
			'Wednesday',
			'• Alpha: Vagastrom, Dionysia',
			'• Gamma: Hotarubi, Jabberwock',
			'• Delta: no declares',
			'',
			'Thursday',
			'• Alpha: no declares',
			// A day played before Beta sat out.
			'• Beta: Vagastrom (from Alpha)',
			'• Gamma: no declares',
			'• Delta: Mortkranken',
		]);
		expect(text.split('\n').at(-1)).toMatch(/^Points: Alpha \d+ · Gamma \d+ · Delta \d+$/u);
	});

	it('can leave out the days before one', () => {
		const text = planToText({
			map, guildNames, goal: 'points', fillMap: false, castleLast: false, inactive: [], fewestDays: false, timeline, from: 3,
		});
		expect(text.split('\n').slice(0, 4)).toEqual([
			'The Floating City · Equal points',
			'From Friday on',
			'',
			'Friday',
		]);
		expect(text).not.toContain('Wednesday');
		expect(text).not.toContain('Thursday');
		// The points are still the whole week's.
		const whole = planToText({
			map, guildNames, goal: 'points', fillMap: false, castleLast: false, inactive: [], fewestDays: false, timeline,
		});
		expect(text.split('\n').at(-1)).toBe(whole.split('\n').at(-1));
	});

	it('can focus on one guild', () => {
		const text = planToText({
			map,
			guildNames,
			goal: 'points',
			fillMap: false,
			castleLast: false,
			inactive: [],
			fewestDays: false,
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
			inactive: [],
			fewestDays: false,
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
			map, guildNames, goal: 'resources', fillMap: true, castleLast: false, inactive: [], fewestDays: false, timeline,
		});
		expect(text.split('\n', 1)[0]).toBe('The Floating City · Equal resources · Use every kingdom');
	});

	it('mentions when extra castle days go last, only while every kingdom is used', () => {
		const title = (isFillMap: boolean) => planToText({
			map, guildNames, goal: 'resources', fillMap: isFillMap, castleLast: true, inactive: [], fewestDays: false, timeline,
		}).split('\n', 1)[0];
		expect(title(true)).toBe(
			'The Floating City · Equal resources · Use every kingdom · Extra castle days last',
		);
		expect(title(false)).toBe('The Floating City · Equal resources');
	});

	it('mentions when guilds declare on the fewest days', () => {
		const text = planToText({
			map, guildNames, goal: 'points', fillMap: false, castleLast: false, inactive: [], fewestDays: true, timeline,
		});
		expect(text.split('\n', 1)[0]).toBe('The Floating City · Equal points · Declare on fewer days');
	});

	it('mentions holdings set by hand instead of the goal and filling the map', () => {
		const text = planToText({
			map,
			guildNames,
			goal: 'points',
			fillMap: true,
			castleLast: true,
			inactive: [],
			fewestDays: true,
			targets: [0, 1, 2, 3].map(() => map.fairHoldings),
			timeline,
		});
		expect(text.split('\n', 1)[0]).toBe('The Floating City · Set holdings by hand · Declare on fewer days');
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
