// @vitest-environment happy-dom
// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {flushSync} from 'svelte';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import {continuePlan, type Ownership, type Plan} from '../domain/plan.ts';
import {DEFAULT_MAP as map, MAPS} from '../maps/index.ts';
import {encodeShareLink} from '../share/link.ts';
import {SolveCancelled, type SolverClient} from '../solver/client.ts';
import type {SolveRequest} from '../solver/protocol.ts';
import type {SolveOutcome} from '../solver/solve.ts';
import {dayInWeekOf, FLOATING_CITY_START} from '../test/fixtures.ts';
import {PlannerState} from './planner.svelte.ts';
import {saveMap} from './storage.ts';

const idx = (id: string) => map.indexOf(id)!;
const idle = () => [[], [], [], []] as number[][];
const plan: Plan = {
	declarations: [[[idx('Vagastrom')], [], [], []], idle(), idle(), idle(), idle(), idle()],
};
const link = encodeShareLink({
	map,
	guildNames: ['Owls', 'Bears', 'Cats', 'Dogs'],
	startingTowns: FLOATING_CITY_START,
	goal: 'points',
	fillMap: false,
	castleLast: false,
	inactive: [],
	fewestDays: false,
	played: [],
	plan,
	received: false,
});
// The same setup and plan as sent to someone else, under other names.
const sent = encodeShareLink({
	map,
	guildNames: ['Foxes', 'Hares', 'Mice', 'Rats'],
	startingTowns: FLOATING_CITY_START,
	goal: 'points',
	fillMap: false,
	castleLast: false,
	inactive: [],
	fewestDays: false,
	played: [],
	plan,
	received: true,
});
const savedLink = () => localStorage.getItem('ragnapax/v1');

beforeEach(() => {
	localStorage.clear();
	history.replaceState(null, '', '/');
	// A week of The Floating City, the map these tests set up: visits without
	// a link open on the week's map. Only the date is faked; timers run.
	vi.useFakeTimers({toFake: ['Date']});
	vi.setSystemTime(dayInWeekOf('floating-city'));
});

afterEach(() => {
	vi.useRealTimers();
});

describe('PlannerState', () => {
	it('opens a plan someone sent as shared, and keeps it in the address bar', () => {
		const planner = new PlannerState();
		planner.restore('#' + sent);
		const stop = planner.sync();
		flushSync();
		stop();
		expect(planner.openedFromLink).toBe(true);
		expect(planner.result?.quality).toBe('shared');
		expect(planner.displayNames).toEqual(['Foxes', 'Hares', 'Mice', 'Rats']);
		expect(planner.scores?.[0]?.points).toBe((4 * 6) + (2 * 6));
		expect(location.hash).toBe('#' + sent);
		expect(savedLink()).toBeNull();
	});

	it('never saves a plan someone sent over the player\'s own', () => {
		const own = new PlannerState();
		own.restore('#' + link);
		own.persist();

		const friend = new PlannerState();
		friend.restore('#' + sent);
		const stop = friend.sync();
		flushSync();
		stop();

		const again = new PlannerState();
		again.restore('');
		expect(again.guildNames).toEqual(['Owls', 'Bears', 'Cats', 'Dogs']);
	});

	it('makes a plan someone sent the player\'s own once they change it', () => {
		const planner = new PlannerState();
		planner.restore('#' + sent);
		const stop = planner.sync();
		flushSync();
		planner.guildNames[0] = 'Wolves';
		flushSync();
		// Undoing the change does not make it someone else's again.
		planner.guildNames[0] = 'Foxes';
		flushSync();
		stop();
		expect(planner.isReceived).toBe(false);
		expect(planner.openedFromLink).toBe(false);
		expect(location.hash).not.toMatch(/&s=/u);
		expect(savedLink()).toContain('g=Foxes');
	});

	it('makes a plan someone sent the player\'s own once they plan', async () => {
		const planner = new PlannerState({
			ready: true,
			onReady: () => () => undefined,
			warmUp: () => undefined,
			solve: () => ({
				result: Promise.resolve({kind: 'timeout', elapsed: 0}),
				cancel: () => undefined,
			}),
		});
		planner.restore('#' + sent);
		await planner.findPlan();
		expect(planner.isReceived).toBe(false);
	});

	it('writes the plan on screen as text, with its guilds\' names', () => {
		const planner = new PlannerState();
		expect(planner.shareText()).toBeUndefined();
		planner.restore('#' + sent);
		expect(planner.shareText()?.split('\n', 1)[0]).toBe('The Floating City · Equal points');
		expect(planner.shareText()).toContain('Foxes: Vagastrom');
		expect(planner.shareText(1)).not.toContain('Foxes');
		expect(planner.shareText(undefined, 2)).not.toContain('Wednesday');
	});

	it('treats a link without the mark as the player\'s own, its plan as saved', () => {
		const planner = new PlannerState();
		planner.restore('#' + link);
		expect(planner.openedFromLink).toBe(false);
		expect(planner.result?.quality).toBe('saved');
	});

	it('saves only the link, never how good its plan was known to be', async () => {
		const planner = new PlannerState({
			ready: true,
			onReady: () => () => undefined,
			warmUp: () => undefined,
			solve: ({start}) => ({
				result: Promise.resolve({
					kind: 'solved',
					quality: 'optimal',
					owners: Array.from({length: 7}, () => [...start]),
					elapsed: 0,
				}),
				cancel: () => undefined,
			}),
		});
		planner.restore('#' + link);
		await planner.findPlan();
		expect(planner.result?.quality).toBe('optimal');
		planner.persist();
		expect(JSON.parse(savedLink()!)).toEqual({maps: {[map.id]: planner.ownFragment}});

		const again = new PlannerState();
		again.switchMap(map);
		expect(again.result?.plan).toEqual(planner.result?.plan);
		expect(again.result?.quality).toBe('saved');
	});

	it('knows when a plan is up to date and proven best, so no plan could beat it', async () => {
		const solved = (quality: 'optimal' | 'proven' | 'unproven') =>
			new PlannerState({
				ready: true,
				onReady: () => () => undefined,
				warmUp: () => undefined,
				solve: ({start}) => ({
					result: Promise.resolve({
						kind: 'solved',
						quality,
						owners: Array.from({length: 7}, () => [...start]),
						elapsed: 0,
					}),
					cancel: () => undefined,
				}),
			});
		for (const [quality, isBest] of [['optimal', true], ['proven', true], ['unproven', false]] as const) {
			const planner = solved(quality);
			planner.restore('#' + link);
			expect(planner.isBest).toBe(false);
			// eslint-disable-next-line no-await-in-loop -- one setup at a time
			await planner.findPlan();
			expect(planner.isBest).toBe(isBest);
			planner.setFillMap(!planner.fillMap);
			expect(planner.isBest).toBe(false);
		}
	});

	it('brings back a setup saved by another version as blank', () => {
		localStorage.setItem(
			'ragnapax/v1',
			JSON.stringify({maps: {[map.id]: {link, quality: 'proven'}}}),
		);
		const planner = new PlannerState();
		planner.switchMap(map);
		expect(planner.result).toBeUndefined();
		expect(planner.startingTowns).toEqual({});
	});

	it('tidies a guild name once the player has finished editing it', () => {
		const planner = new PlannerState();
		planner.restore('#' + link);
		planner.guildNames[1] = '  Nightowls ';
		planner.finishGuildName(1);
		expect(planner.guildNames[1]).toBe('Nightowls');
	});

	it('keeps a guild name to the game\'s 9 characters as it is typed', () => {
		const planner = new PlannerState();
		planner.restore('#' + link);
		expect(planner.setGuildName(1, 'Night ')).toBe('Night ');
		expect(planner.setGuildName(1, 'Night owls')).toBe('Night owl');
		expect(planner.guildNames[1]).toBe('Night owl');
	});

	it('opens on the map of the week without a link, as last set up there', () => {
		const first = new PlannerState();
		first.restore('#' + link);
		first.persist();

		// The Sea of Poseidon's week: every group plays it.
		vi.setSystemTime(dayInWeekOf('sea-of-poseidon'));
		const sea = new PlannerState();
		sea.restore('');
		expect(sea.map.id).toBe('sea-of-poseidon');
		expect(sea.result).toBeUndefined();

		vi.setSystemTime(dayInWeekOf('floating-city'));
		const sky = new PlannerState();
		sky.restore('');
		expect(sky.map.id).toBe('floating-city');
		expect(sky.result?.plan).toEqual(plan);
	});

	it('brings back the saved setup and plan when opened without a link', () => {
		const first = new PlannerState();
		first.restore('#' + link);
		first.persist();

		const again = new PlannerState();
		again.restore('');
		expect(again.guildNames).toEqual(['Owls', 'Bears', 'Cats', 'Dogs']);
		expect(again.result?.plan).toEqual(plan);
		expect(again.stale).toBe(false);
	});

	it('keeps the address bar in step with the setup', () => {
		const planner = new PlannerState();
		planner.restore('#' + link);
		const stop = planner.sync();
		flushSync();
		expect(location.hash).toBe('#' + link);
		planner.toggleTown('Q', 0);
		flushSync();
		stop();
		expect(location.hash).toBe('#' + planner.ownFragment);
		expect(location.hash).not.toContain('&p=');
	});

	it('catches up with the address bar when the browser refuses a change', () => {
		vi.useFakeTimers();
		const replace = vi.spyOn(history, 'replaceState').mockImplementationOnce(() => {
			throw new DOMException('Too many calls', 'SecurityError');
		});
		const planner = new PlannerState();
		planner.restore('#' + link);
		const stop = planner.sync();
		flushSync();
		expect(location.hash).not.toBe('#' + link);
		vi.advanceTimersByTime(1000);
		expect(location.hash).toBe('#' + link);
		stop();
		replace.mockRestore();
		vi.useRealTimers();
	});

	it('marks the plan stale when the setup changes, and fresh when it is undone', () => {
		const planner = new PlannerState();
		planner.restore('#' + link);
		planner.toggleTown('Q', 0);
		expect(planner.stale).toBe(true);
		expect(planner.status.complete).toBe(false);
		planner.toggleTown('Q', 0);
		expect(planner.stale).toBe(false);
		planner.setGoal('resources');
		expect(planner.stale).toBe(true);
		planner.setGoal('points');
		planner.setFillMap(true);
		expect(planner.stale).toBe(true);
	});

	it('puts the setup away once there is a plan, until the player asks to edit it', async () => {
		const planner = new PlannerState({
			ready: true,
			onReady: () => () => undefined,
			warmUp: () => undefined,
			solve: ({start}) => ({
				result: Promise.resolve({
					kind: 'solved',
					quality: 'optimal',
					owners: Array.from({length: 7}, () => [...start]),
					elapsed: 0,
				}),
				cancel: () => undefined,
			}),
		});
		planner.restore('#' + link);
		expect(planner.isSetupOpen).toBe(false);
		planner.editSetup();
		planner.setGoal('resources');
		expect(planner.isSetupOpen).toBe(true);
		await planner.findPlan();
		expect(planner.isSetupOpen).toBe(false);

		planner.clearTowns();
		const again = new PlannerState();
		again.restore('#' + planner.address);
		expect(again.isSetupOpen).toBe(true);
	});

	it('does not treat renaming a guild as a setup change', () => {
		const planner = new PlannerState();
		planner.restore('#' + link);
		planner.guildNames[0] = '';
		expect(planner.stale).toBe(false);
		expect(planner.displayNames[0]).toBe('Guild 1');
	});

	it('autosaves every setting, including the options for using every kingdom and the advanced ones', () => {
		const planner = new PlannerState();
		planner.restore('#' + link);
		const stop = planner.sync();
		flushSync();
		planner.setFillMap(true);
		planner.setCastleLast(true);
		planner.setSittingOut(2, true);
		planner.setFewestDays(true);
		flushSync();
		stop();

		const again = new PlannerState();
		again.restore('');
		expect(again.fillMap).toBe(true);
		expect(again.castleLast).toBe(true);
		expect(again.inactive).toEqual([2]);
		expect(again.fewestDays).toBe(true);
	});

	it('plans for another group on the same map, keeping the goal and options', () => {
		const planner = new PlannerState();
		planner.restore('#' + sent);
		planner.editSetup();
		planner.setCastleLast(true);
		planner.setFewestDays(true);
		planner.setTargets(true);
		planner.setSittingOut(2, true);
		planner.recordDay(planner.history[0]!);
		expect(planner.played).toHaveLength(1);
		const stop = planner.sync();
		flushSync();

		planner.planAnotherGroup();
		flushSync();
		stop();
		expect(planner.map).toBe(map);
		expect(planner.guildNames).toEqual(['', '', '', '']);
		expect(planner.startingTowns).toEqual({});
		expect(planner.played).toEqual([]);
		expect(planner.result).toBeUndefined();
		expect(planner.isSetupOpen).toBe(true);
		expect(planner.isReceived).toBe(false);
		// Guilds sitting out belong to the group, like its names and towns.
		expect(planner.inactive).toEqual([]);
		expect(planner.goal).toBe('points');
		expect(planner.castleLast).toBe(true);
		expect(planner.fewestDays).toBe(true);
		expect(planner.targets).toEqual(planner.guildNames.map(() => map.fairHoldings));

		const again = new PlannerState();
		again.restore('');
		expect(again.setup).toEqual(planner.setup);
	});

	it('warns about a plan that does not leave a guild sitting out alone, after the days played', () => {
		const planner = new PlannerState();
		// Guild 1, sitting out, takes Vagastrom on Wednesday.
		planner.restore('#' + link.replace('&g=', '&i=1&g='));
		expect(planner.result).toBeDefined();
		expect(planner.disturbance).toEqual({
			kind: 'declares', day: 1, guild: 0, kingdom: idx('Vagastrom'),
		});
		planner.recordAsPlanned(1);
		expect(planner.disturbance).toBeUndefined();
	});

	it('sets holdings by hand from the map\'s fair ones, in place of the goal and filling the map', () => {
		const planner = new PlannerState();
		planner.restore('#' + link);
		planner.setFillMap(true);
		planner.setCastleLast(true);
		planner.setTargets(true);
		expect(planner.targets).toEqual([0, 1, 2, 3].map(() => map.fairHoldings));
		expect(planner.settings).toMatchObject({fillMap: false, castleLast: false, targets: planner.targets});
		// Kept for when holdings are no longer set, after a refresh too.
		const again = new PlannerState();
		again.restore('#' + planner.address);
		expect(again).toMatchObject({fillMap: true, castleLast: true, targets: planner.targets});
		planner.setTargets(false);
		expect(planner.settings).toMatchObject({fillMap: true, castleLast: true, targets: undefined});
	});

	it('keeps each number set by hand whole and within what the map allows', () => {
		const planner = new PlannerState();
		planner.restore('#' + link);
		expect(planner.setTarget(0, 'castle', 2)).toBeUndefined();
		planner.setTargets(true);
		expect(planner.setTarget(0, 'castle', 2.4)).toBe(2);
		expect(planner.setTarget(1, 'castle', 40)).toBe(6);
		expect(planner.setTarget(2, 'town', -3)).toBe(0);
		expect(planner.setTarget(3, 'town', NaN)).toBeUndefined();
		expect(planner.targets?.map(held => held.castle)).toEqual([2, 6, 1, 1]);
		expect(planner.targets?.[2]?.town).toBe(0);
		expect(planner.stale).toBe(true);
		// Back to the map's fair holdings.
		planner.setTargets(true);
		expect(planner.targets).toEqual([0, 1, 2, 3].map(() => map.fairHoldings));
	});

	it('says which kinds add up to more days than the map has, among the guilds that play', () => {
		const planner = new PlannerState();
		planner.restore('#' + link);
		planner.setTargets(true);
		expect(planner.excessTargets).toEqual([]);
		planner.setTarget(0, 'castle', 4);
		expect(planner.excessTargets).toEqual([{kind: 'castle', count: 7, most: 6}]);
		planner.setSittingOut(3, true);
		expect(planner.excessTargets).toEqual([]);
	});

	it('lets guilds sit out, in guild order, but never every guild', () => {
		const planner = new PlannerState();
		planner.restore('#' + link);
		planner.setSittingOut(3, true);
		planner.setSittingOut(1, true);
		expect(planner.inactive).toEqual([1, 3]);
		expect(planner.stale).toBe(true);
		planner.setSittingOut(0, true);
		planner.setSittingOut(2, true);
		expect(planner.inactive).toEqual([0, 1, 3]);
		planner.setSittingOut(1, false);
		planner.setSittingOut(0, false);
		planner.setSittingOut(3, false);
		expect(planner.inactive).toEqual([]);
		expect(planner.stale).toBe(false);
	});

	it('asks the solver to leave guilds sitting out alone, and refuses plans that do not', async () => {
		let request: SolveRequest | undefined;
		const client: SolverClient = {
			ready: true,
			onReady: () => () => undefined,
			warmUp: () => undefined,
			solve(asked) {
				// The worker can only be sent what can be cloned.
				request = structuredClone(asked);
				// Guild 1, sitting out, takes Vagastrom on Wednesday.
				const owners: Ownership[] = Array.from({length: 7}, (_, day) =>
					asked.start.map((owner, t) => (day > 0 && t === idx('Vagastrom') ? 0 : owner)),
				);
				return {
					result: Promise.resolve({
						kind: 'solved', quality: 'optimal', owners, elapsed: 0,
					}),
					cancel: () => undefined,
				};
			},
		};
		const planner = new PlannerState(client);
		planner.restore('#' + link);
		planner.setSittingOut(0, true);
		await planner.findPlan();
		expect(request?.settings.inactive).toEqual([0]);
		expect(planner.solve.phase === 'failed' && planner.solve.detail).toMatch(/disturbed a guild sitting out.*declares/u);
	});

	it('locks the starting towns while a plan is found for them', async () => {
		let settle: {resolve(outcome: SolveOutcome): void} | undefined;
		const planner = new PlannerState({
			ready: true,
			onReady: () => () => undefined,
			warmUp: () => undefined,
			solve: () => ({
				result: new Promise<SolveOutcome>(resolve => {
					settle = {resolve};
				}),
				cancel: () => undefined,
			}),
		});
		planner.restore('#' + link);
		const solving = planner.findPlan();
		expect(planner.townLock).toBe('solving');
		planner.toggleTown('A', 1);
		planner.clearTowns();
		expect(planner.startingTowns).toEqual(FLOATING_CITY_START);

		settle?.resolve({kind: 'timeout', elapsed: 0});
		await solving;
		expect(planner.townLock).toBeUndefined();
		planner.toggleTown('A', 1);
		expect(planner.startingTowns.A).toBe(1);
	});

	it('unlocks the starting towns once the plan is proven fairest, keeping it', async () => {
		let isCancelled = false;
		let prove: (() => void) | undefined;
		const client: SolverClient = {
			ready: true,
			onReady: () => () => undefined,
			warmUp: () => undefined,
			solve({start}, handlers) {
				const stopped = new AbortController();
				prove = () => {
					handlers.onImprovement(continuePlan(map, [start], plan), {elapsed: 0, proven: true});
				};

				return {
					result: new Promise<SolveOutcome>((_resolve, reject) => {
						stopped.signal.addEventListener('abort', () => {
							reject(new SolveCancelled());
						});
					}),
					cancel() {
						isCancelled = true;
						stopped.abort();
					},
				};
			},
		};
		const planner = new PlannerState(client);
		planner.restore('#' + link);
		planner.editSetup();
		const solving = planner.findPlan();
		expect(planner.townLock).toBe('solving');

		// Only declares are left to trim: a change keeps the plan proven fairest.
		prove?.();
		expect(planner.townLock).toBeUndefined();
		planner.toggleTown('A', 1);
		await solving;
		expect(isCancelled).toBe(true);
		expect(planner.solve.phase).toBe('idle');
		expect(planner.startingTowns.A).toBe(1);
		expect(planner.result?.quality).toBe('proven');
		expect(planner.stale).toBe(true);
		expect(planner.isSetupOpen).toBe(true);
	});

	it('saves a moment after the last change, or as soon as the page is hidden', () => {
		vi.useFakeTimers({toFake: ['Date', 'setTimeout', 'clearTimeout']});
		vi.setSystemTime(dayInWeekOf('floating-city'));
		const planner = new PlannerState();
		planner.restore('#' + link);
		const stop = planner.sync();
		flushSync();
		vi.runAllTimers();
		const setItem = vi.spyOn(localStorage, 'setItem');
		for (const name of ['W', 'Wo', 'Wol', 'Wolf']) {
			planner.setGuildName(0, name);
			flushSync();
		}

		expect(setItem).not.toHaveBeenCalled();
		// Where the page is, though, follows at once.
		expect(location.hash).toContain('g=Wolf');
		vi.advanceTimersByTime(1000);
		expect(setItem).toHaveBeenCalledOnce();
		expect(savedLink()).toContain('g=Wolf');

		planner.setGuildName(0, 'Wolves');
		flushSync();
		dispatchEvent(new Event('pagehide'));
		expect(savedLink()).toContain('g=Wolves');
		stop();
		setItem.mockRestore();
	});

	it('never saves a change still waiting once everything is deleted', async () => {
		vi.useFakeTimers({toFake: ['Date', 'setTimeout', 'clearTimeout']});
		vi.setSystemTime(dayInWeekOf('floating-city'));
		const replace = vi.spyOn(location, 'replace').mockImplementation(() => undefined);
		const planner = new PlannerState();
		planner.restore('#' + link);
		const stop = planner.sync();
		flushSync();
		await planner.forgetEverything();
		vi.runAllTimers();
		stop();
		expect(savedLink()).toBeNull();
		expect(replace).toHaveBeenCalled();
		replace.mockRestore();
	});

	it('gives a town to a guild, or leaves it Vacant, but not while the towns are locked', () => {
		const planner = new PlannerState();
		planner.restore('');
		planner.assignTown('A', 2);
		planner.assignTown('B', 1);
		planner.assignTown('A', 3);
		planner.assignTown('B', undefined);
		expect(planner.startingTowns).toEqual({A: 3});

		planner.restore('#' + link);
		planner.recordAsPlanned(1);
		expect(planner.townLock).toBe('played');
		planner.assignTown('A', undefined);
		expect(planner.startingTowns).toEqual(FLOATING_CITY_START);
	});

	it('remembers setting towns from lists on this device for every map, but never in links', () => {
		const planner = new PlannerState();
		planner.restore('#' + link);
		expect(planner.townLists).toBe(false);
		const stop = planner.sync();
		flushSync();
		planner.setTownLists(true);
		flushSync();
		stop();
		expect(location.hash).toBe('#' + link);
		expect(savedLink()).toBe(JSON.stringify({maps: {[map.id]: link}}));

		const again = new PlannerState();
		again.restore('');
		again.switchMap(MAPS.find(m => m !== map)!);
		expect(again.townLists).toBe(true);

		again.setTownLists(false);
		expect(new PlannerState().townLists).toBe(false);
	});

	it('keeps a setup that is still being filled in', () => {
		const planner = new PlannerState();
		planner.restore('');
		planner.toggleTown('A', 2);
		planner.persist();

		const again = new PlannerState();
		again.restore('');
		expect(again.startingTowns).toEqual({A: 2});
	});

	describe('recording days as played', () => {
		// Wednesday did not go to plan: guild 2 took Vagastrom instead of guild 1.
		const wednesday = () => {
			const owners = [...planner().history[0]!];
			owners[idx('Vagastrom')] = 1;
			return owners;
		};

		let current: PlannerState;
		const planner = () => current;
		beforeEach(() => {
			current = new PlannerState();
			current.restore('#' + link);
		});

		it('keeps the old plan on screen, out of date, and saves the day', () => {
			current.recordDay(wednesday());
			expect(current.played).toEqual([[[], [idx('Vagastrom')], [], []]]);
			expect(current.history[1]![idx('Vagastrom')]).toBe(1);
			expect(current.nextDay).toBe(2);
			expect(current.stale).toBe(true);
			expect(current.result?.plan).toEqual(plan);
			current.persist();

			const again = new PlannerState();
			again.restore('');
			expect(again.played).toEqual(current.played);
		});

		it('ignores a day the rules cannot reach', () => {
			const owners = [...current.history[0]!];
			owners[idx('Darkwick')] = 0;
			current.recordDay(owners);
			expect(current.played).toEqual([]);
		});

		it('locks the starting towns until the days are forgotten', () => {
			current.recordDay(wednesday());
			current.toggleTown('A', 1);
			current.clearTowns();
			expect(current.startingTowns.A).toBe(0);

			current.forgetDay();
			expect(current.played).toEqual([]);
			expect(current.stale).toBe(false);
			current.toggleTown('A', 1);
			expect(current.startingTowns.A).toBe(1);
		});

		it('never records Monday, as nothing would be left to plan', () => {
			for (let day = 1; day <= 6; day++) {
				current.recordDay(current.history.at(-1)!);
			}

			expect(current.played).toHaveLength(5);
			expect(current.nextDay).toBeUndefined();
		});

		it('records the days that went to plan in one go', () => {
			expect(current.lastPlannedDay).toBe(5);
			current.recordAsPlanned(3);
			expect(current.played).toEqual(plan.declarations.slice(0, 3));
			expect(current.nextDay).toBe(4);
			// Past Sunday, or before the next day, there is nothing to record.
			current.recordAsPlanned(6);
			current.recordAsPlanned(3);
			expect(current.played).toHaveLength(3);
			current.recordAsPlanned(5);
			expect(current.played).toEqual(plan.declarations.slice(0, 5));
			expect(current.lastPlannedDay).toBeUndefined();
		});

		it('records nothing as planned once a day went otherwise', () => {
			current.recordDay(wednesday());
			expect(current.lastPlannedDay).toBeUndefined();
			current.recordAsPlanned(3);
			expect(current.played).toHaveLength(1);
		});

		it('plans the rest of the week from the days played', async () => {
			let request: SolveRequest | undefined;
			const client: SolverClient = {
				ready: true,
				onReady: () => () => undefined,
				warmUp: () => undefined,
				solve(r) {
					request = r;
					return {
						result: Promise.resolve({kind: 'timeout', elapsed: 0}),
						cancel: () => undefined,
					};
				},
			};
			current = new PlannerState(client);
			current.restore('#' + link);
			current.recordDay(wednesday());
			await current.findPlan();
			expect(request?.played).toEqual([wednesday()]);
			// Starting from the old plan, carried on from what was played.
			expect(request?.hint).toEqual(continuePlan(map, current.history, plan));
		});
	});

	it('reports a broken link and falls back to the saved setup', () => {
		const planner = new PlannerState();
		planner.restore('#v=1&m=atlantis');
		expect(planner.linkError?.problem).toBe('map');
		expect(planner.result).toBeUndefined();
	});

	it('stops and reports a solver plan that breaks the rules', async () => {
		let isCancelled = false;
		const client: SolverClient = {
			ready: true,
			onReady: () => () => undefined,
			warmUp: () => undefined,
			solve({start}, handlers) {
				const stopped = new AbortController();
				const result = new Promise<SolveOutcome>((_resolve, reject) => {
					stopped.signal.addEventListener('abort', () => {
						reject(new SolveCancelled());
					});
				});
				// Guild 1 takes the castle on Wednesday, nowhere near its towns.
				const owners: Ownership[] = Array.from({length: 7}, (_, day) =>
					start.map((owner, t) => (day > 0 && t === idx('Darkwick') ? 0 : owner)),
				);
				setTimeout(() => {
					handlers.onImprovement(owners, {elapsed: 0, proven: false});
				}, 0);
				return {
					result,
					cancel() {
						isCancelled = true;
						stopped.abort();
					},
				};
			},
		};
		const planner = new PlannerState(client);
		planner.restore('#' + link);
		await planner.findPlan();
		expect(isCancelled).toBe(true);
		expect(planner.solve).toMatchObject({phase: 'failed', reason: 'error'});
		expect(planner.solve.phase === 'failed' && planner.solve.detail).toMatch(/broke a rule/u);
	});
});
