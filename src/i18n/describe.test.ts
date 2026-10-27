// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
	afterEach,
	describe,
	expect,
	it,
} from 'vitest';
import {simulate, startingOwnership, type Plan} from '../domain/plan.ts';
import {efforts, priorities, refinements} from '../domain/settings.ts';
import {DAY_NAMES} from '../domain/types.ts';
import {DEFAULT_MAP, MAPS} from '../maps/index.ts';
import {decodeShareLink, type ShareLinkError} from '../share/link.ts';
import {FLOATING_CITY_START} from '../test/fixtures.ts';
import {
	describeCriterion,
	describeDisturbance,
	describeEffort,
	describeLinkError,
	describeQuality,
	describeViolation,
	mapName,
	kingdomLabel,
	kingdomName,
} from './describe.ts';
import {
	currentLocale,
	list,
	rich,
	setLocale,
	t,
	weekday,
} from './i18n.svelte.ts';

afterEach(async () => setLocale('en'));

describe.each(MAPS)('English names on $name', map => {
	it('match the map data', () => {
		expect(mapName(map)).toBe(map.name);
		for (const kingdom of map.kingdoms) {
			expect(kingdomName(kingdom)).toBe(kingdom.name);
			expect(kingdomLabel(kingdom)).toBe(kingdom.label);
		}
	});
});

it('names the days Wednesday to Monday', () => {
	expect(DAY_NAMES.map((_, i) => weekday(i + 1, 'long'))).toEqual(DAY_NAMES);
	expect(weekday(1, 'short')).toBe('Wed');
	// In the interface language, whatever the browser's own language is.
	expect(list(['A', 'B', 'C'])).toBe('A, B, and C');
});

it('describes the priorities in words', () => {
	const settings = {
		goal: 'resources', fillMap: true, castleLast: false, inactive: [], fewestDays: false,
	} as const;
	expect(
		[...priorities(settings), ...refinements(settings)].map(c => describeCriterion(c)),
	).toEqual([
		'Most points for everyone combined',
		'Smallest gap in castle-days between guilds',
		'Smallest gap in dorm-days between guilds',
		'Smallest gap in town-days between guilds',
		'Smallest gap in points between guilds',
	]);
	expect(efforts(settings).map(effort => describeEffort(effort))).toEqual(['Fewest declares']);
	const byHand = {...settings, targets: [0, 1, 2, 3].map(() => DEFAULT_MAP.fairHoldings)};
	expect(priorities(byHand).map(c => describeCriterion(c))).toEqual([
		'Castle-days closest to those set for each guild',
		'Dorm-days closest to those set for each guild',
		'Town-days closest to those set for each guild',
	]);
	expect(efforts({fewestDays: true}).map(effort => describeEffort(effort))).toEqual([
		'Fewest days with declares, per guild',
		'Fewest declares',
	]);
});

it('says what an optimal plan keeps down', () => {
	const optimal = (isFillMap: boolean, isFewestDays: boolean) =>
		describeQuality('optimal', {fillMap: isFillMap, fewestDays: isFewestDays});
	expect(optimal(false, false)).toBe('The fairest plan possible, with the fewest declares.');
	expect(optimal(false, true)).toBe('The fairest plan possible, with declares on the fewest days.');
	expect(optimal(true, true)).toMatch(/^Uses as much of the map as possible.*, with declares on the fewest days\.$/u);
	// Holdings set by hand, whether or not the map filling switch was on.
	const targets = [0, 1, 2, 3].map(() => DEFAULT_MAP.fairHoldings);
	for (const isFillMap of [false, true]) {
		expect(describeQuality('optimal', {fillMap: isFillMap, fewestDays: false, targets})).toBe(
			'As close as possible to the holdings set for each guild, with the fewest declares.',
		);
		expect(describeQuality('optimal', {fillMap: isFillMap, fewestDays: true, targets})).toBe(
			'As close as possible to the holdings set for each guild, with declares on the fewest days.',
		);
		expect(describeQuality('proven', {fillMap: isFillMap, fewestDays: true, targets})).toBe(
			'As close as possible to the holdings set for each guild.',
		);
	}

	// Only an optimal plan is proven to make the fewest of either.
	expect(describeQuality('proven', {fillMap: false, fewestDays: true})).toBe(
		describeQuality('proven', {fillMap: false, fewestDays: false}),
	);
});

describe('describeViolation', () => {
	const map = DEFAULT_MAP;
	const idx = (id: string) => map.indexOf(id)!;
	const idle = (): number[][] => [[], [], [], []];
	const plan: Plan = {
		declarations: [
			[[idx('Darkwick'), idx('A'), idx('Vagastrom'), idx('Dionysia')], [idx('Vagastrom')], [], []],
			...Array.from({length: 5}, idle),
		],
	};
	const {violations} = simulate(map, startingOwnership(map, FLOATING_CITY_START), plan);

	it('names guilds as numbers when they have no names', () => {
		expect(violations.map(v => describeViolation(map, v))).toEqual([
			'Wednesday: Guild 1 declares 4 times (max 3).',
			'Wednesday: Guild 1 declares on Darkwick Castle without holding a kingdom next to it.',
			'Wednesday: Guild 1 declares on Town A, which it already holds.',
			'Wednesday: Guild 1 and Guild 2 both declare on Vagastrom.',
		]);
	});

	it('uses the guilds\' names when it has them', () => {
		expect(describeViolation(map, violations[3]!, ['Owls', '', 'Cats', 'Dogs'])).toBe(
			'Wednesday: Owls and Guild 2 both declare on Vagastrom.',
		);
	});

	it('words a kingdom declared twice', () => {
		expect(describeViolation(map, {
			rule: 'twice', day: 2, guild: 2, kingdom: idx('Vagastrom'),
		})).toBe('Thursday: Guild 3 declares on Vagastrom twice.');
	});

	it('explains a share link with an illegal plan', () => {
		try {
			decodeShareLink('v=1&m=floating-city&o=p&t=11112222333344440&p=0-----');
			expect.unreachable();
		} catch (error) {
			expect(describeLinkError(error as ShareLinkError)).toBe(
				'This link\'s plan breaks Ragnarok\'s rules: Wednesday: Guild 1 declares on Town A, which it already holds.',
			);
		}
	});
});

describe('describeDisturbance', () => {
	const map = DEFAULT_MAP;
	const idx = (id: string) => map.indexOf(id)!;
	const names = ['Owls', 'Bears', 'Cats', 'Dogs'];

	it('warns that a guild sitting out may defend, rather than calling it a broken rule', () => {
		expect(describeDisturbance(map, {
			kind: 'attacks', day: 2, guild: 1, rival: 0, kingdom: idx('Vagastrom'),
		}, names)).toBe(
			'Thursday: Bears declares on Vagastrom, held by Owls, which sits out. Guilds sitting out may defend their kingdoms when attacked.',
		);
		expect(describeDisturbance(map, {
			kind: 'declares', day: 1, guild: 0, kingdom: idx('Vagastrom'),
		}, names)).toBe('Wednesday: Owls declares on Vagastrom, though it sits out.');
	});
});

describe('messages', () => {
	it('mark bold runs for Rich.svelte', () => {
		expect(rich('score.points', {count: 50})).toEqual([
			{text: 'Every guild scores ', bold: false},
			{text: '50 points', bold: true},
			{text: '.', bold: false},
		]);
		expect(t('score.points', {count: 1})).toBe('Every guild scores 1 point.');
	});

	it('switch language, falling back to English for what is not translated yet', async () => {
		await setLocale('fr');
		expect(currentLocale()).toBe('fr');
		expect(weekday(1, 'long')).toBe('mercredi');
		expect(list(['A', 'B', 'C'])).toBe('A, B et C');
		// The French catalogue is still empty.
		expect(t('setup.title')).toBe('Starting towns');
	});
});
