// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {GameMap} from '../domain/map.ts';
import {
	cleanGuildName,
	continuePlan,
	cutGuildName,
	dayBetween,
	planFromTimeline,
	replay,
	score,
	setupStatus,
	simulate,
	disturbances,
	startingOwnership,
	type DayDeclarations,
	type Ownership,
	type Plan,
} from '../domain/plan.ts';
import {DEFAULT_SETTINGS, type Goal, type PlanSettings} from '../domain/settings.ts';
import {
	DAYS,
	GUILD_COUNT,
	GUILDS,
	type GuildIndex,
} from '../domain/types.ts';
import {DEFAULT_MAP, mapOfWeek} from '../maps/index.ts';
import {
	decodeShareLink,
	encodeShareLink,
	ShareLinkError,
	type SharedPlan,
} from '../share/link.ts';
import {defaultGuildName} from '../i18n/describe.ts';
import type {SolverClient} from '../solver/client.ts';
import type {PlanQuality} from '../solver/solve.ts';
import {AddressBar} from './address.ts';
import {Solving, type SolvePhase} from './solving.svelte.ts';
import {
	DelayedSave,
	forgetAll,
	loadSaved,
	type ResultQuality,
} from './storage.ts';

export type {ResultQuality} from './storage.ts';
export type {SolvePhase} from './solving.svelte.ts';

export type PlanResult = {
	readonly plan: Plan;
	readonly quality: ResultQuality;
	/**
	Starting position and settings the plan was made for.
	*/
	readonly start: Ownership;
	readonly settings: PlanSettings;
	/**
	Key of the inputs above; the plan is stale once the setup differs.
	*/
	readonly inputs: string;
};

/**
An empty setup for a map. Guild names start blank and are shown as
"Guild 1" and so on, so the defaults follow the interface language.
*/
const blankSetup = (map: GameMap): SharedPlan => ({
	map,
	guildNames: GUILDS.map(() => ''),
	startingTowns: {},
	...DEFAULT_SETTINGS,
	played: [],
	plan: undefined,
	received: false,
});

/**
All application state, plus the actions that change it. Components read
fields directly and call methods; they never reach into storage, links or
the solver themselves. Running the solver is left to `Solving`, and writing
the address bar to `AddressBar`.
*/
export class PlannerState {
	private readonly solving: Solving;
	private readonly addressBar = new AddressBar();
	private readonly saving = new DelayedSave();
	/**
	The setup as received from someone else's link (`s=1`), until the player
	changes anything or plans: it is never saved over their own.
	*/
	private received = $state<string | undefined>();
	/**
	The plan on screen as positions, if it keeps the rules and agrees with
	every day recorded: its later days can then be recorded just as planned.
	*/
	private readonly plannedWeek = $derived.by(() => {
		if (!this.result) {
			return undefined;
		}

		const {owners, violations} = replay(this.map, this.result.start, this.result.plan.declarations);
		if (violations.length > 0) {
			return undefined;
		}

		const isFollowed = this.history.every((known, day) => {
			const planned = owners[day];
			return planned?.length === known.length && known.every((owner, i) => owner === planned[i]);
		});
		return isFollowed ? owners : undefined;
	});

	map = $state.raw<GameMap>(DEFAULT_MAP);
	guildNames = $state<string[]>([...blankSetup(DEFAULT_MAP).guildNames]);
	startingTowns = $state<Record<string, GuildIndex>>({});
	goal = $state<Goal>(DEFAULT_SETTINGS.goal);
	fillMap = $state(DEFAULT_SETTINGS.fillMap);
	castleLast = $state(DEFAULT_SETTINGS.castleLast);
	/**
	Guilds sitting out, in guild order. Raw, as it goes to the solver worker,
	which cannot be sent a proxy.
	*/
	inactive = $state.raw<readonly GuildIndex[]>(DEFAULT_SETTINGS.inactive);
	fewestDays = $state(DEFAULT_SETTINGS.fewestDays);
	/**
	Days already played, as they happened; see `recordDay`.
	*/
	played = $state.raw<readonly DayDeclarations[]>([]);
	result = $state.raw<PlanResult | undefined>();
	/**
	Problem with the link the page was opened from, if any.
	*/
	linkError = $state.raw<ShareLinkError | undefined>();
	/**
	Whether the setup is open for editing. It is put away once there is a
	plan, so a stray tap cannot put the plan out of date, until the player
	asks to edit it.
	*/
	isSetupOpen = $state(true);

	/**
	Guild names for display, with blanks filled in.
	*/
	readonly displayNames = $derived(
		this.guildNames.map((name, g) => (name.trim() === '' ? defaultGuildName(g) : name.trim())),
	);

	readonly status = $derived(setupStatus(this.map, this.startingTowns));
	readonly start = $derived(startingOwnership(this.map, this.startingTowns));
	readonly settings: PlanSettings = $derived({
		goal: this.goal,
		fillMap: this.fillMap,
		castleLast: this.castleLast,
		inactive: this.inactive,
		fewestDays: this.fewestDays,
	});

	/**
	Position at the start and at the end of each day played.
	*/
	readonly history: readonly Ownership[] = $derived(
		replay(this.map, this.start, this.played).owners,
	);

	/**
	The day that can be recorded next, if any: never Monday, as nothing
	would be left to plan.
	*/
	readonly nextDay = $derived(
		this.status.complete && this.played.length < DAYS - 1 ? this.played.length + 1 : undefined,
	);

	/**
	The last day `recordAsPlanned` can record, if any: never Monday, like
	`nextDay`.
	*/
	readonly lastPlannedDay = $derived(
		this.plannedWeek && this.nextDay !== undefined && this.plannedWeek.length >= DAYS
			? DAYS - 1
			: undefined,
	);

	/**
	Identifies what a plan depends on; guild names are only labels.
	*/
	readonly inputs = $derived(
		encodeShareLink({
			map: this.map,
			guildNames: [],
			startingTowns: this.startingTowns,
			...this.settings,
			played: this.played,
			plan: undefined,
			received: false,
		}),
	);

	readonly stale = $derived(this.result !== undefined && this.result.inputs !== this.inputs);
	readonly timeline = $derived(
		this.result ? simulate(this.map, this.result.start, this.result.plan) : undefined,
	);

	readonly scores = $derived(this.timeline ? score(this.map, this.timeline) : undefined);
	/**
	The first declare of an up-to-date plan, after the days played, that does
	not leave a guild sitting out alone, such as in a link made by hand. It
	breaks no rule, so the plan is shown, with a warning.
	*/
	readonly disturbance = $derived(
		this.timeline && !this.stale
			? disturbances(this.timeline, this.inactive, this.played.length + 1)[0]
			: undefined,
	);

	/**
	True while the plan is up to date and proven the best there is, so
	planning again could not improve on it.
	*/
	readonly isBest = $derived(
		!this.stale && (this.result?.quality === 'optimal' || this.result?.quality === 'proven'),
	);

	/**
	True while showing a setup received from someone else's link.
	*/
	readonly isReceived = $derived(this.received !== undefined);
	/**
	True while showing a plan someone else shared, as opened.
	*/
	readonly openedFromLink = $derived(this.isReceived && this.result !== undefined);
	/**
	The current setup and up-to-date plan.
	*/
	readonly setup: SharedPlan = $derived({
		map: this.map,
		guildNames: this.guildNames,
		startingTowns: this.startingTowns,
		...this.settings,
		played: this.played,
		plan: this.result && !this.stale ? this.result.plan : undefined,
		received: this.isReceived,
	});

	/**
	The current setup and plan as the player's own link fragment.
	*/
	readonly ownFragment = $derived(encodeShareLink({...this.setup, received: false}));
	/**
	What the address bar holds: the current setup and plan, still marked as
	received while it is someone else's.
	*/
	readonly address = $derived(encodeShareLink(this.setup));

	constructor(client?: SolverClient) {
		this.solving = new Solving(client);
	}

	private apply(setup: SharedPlan, quality: ResultQuality): void {
		this.cancel();
		this.map = setup.map;
		this.guildNames = [...setup.guildNames];
		this.startingTowns = {...setup.startingTowns};
		this.goal = setup.goal;
		this.fillMap = setup.fillMap;
		this.castleLast = setup.castleLast;
		this.inactive = setup.inactive;
		this.fewestDays = setup.fewestDays;
		this.played = setup.played;
		this.result = setup.plan && {
			plan: setup.plan,
			quality,
			start: this.start,
			settings: this.settings,
			inputs: this.inputs,
		};
		this.isSetupOpen = setup.plan === undefined;
	}

	/**
	Stops any running solve, keeping the best plan found so far. Returns
	whether there was one.
	*/
	private keepBestPlan(): boolean {
		if (this.solve.phase !== 'solving') {
			return false;
		}

		const {isProven} = this.solving;
		this.solving.cancel();
		// A plan brought back or shared, or one for another setup, is not this solve's.
		if (!this.result || this.stale || this.result.quality === 'saved' || this.result.quality === 'shared') {
			return false;
		}

		this.result = {...this.result, quality: isProven ? 'proven' : 'unproven'};
		return true;
	}

	get solve(): SolvePhase {
		return this.solving.phase;
	}

	/**
	Whether the solver has finished downloading and compiling.
	*/
	get solverReady(): boolean {
		return this.solving.ready;
	}

	/**
	Why the starting towns cannot be changed, if they cannot: days were
	played from them, or a plan is being found for them, which a change
	would put out of date before it arrived. Once the solver has proven its
	plan fairest, only declares are left to trim, which can take a while
	on an old phone: a change then keeps that plan and stops the solve.
	*/
	get townLock(): 'played' | 'solving' | undefined {
		if (this.played.length > 0) {
			return 'played';
		}

		return this.solve.phase === 'solving' && !this.solving.isProven ? 'solving' : undefined;
	}

	/**
	Loads the setup in the URL, or else this week's map, as last set up on
	this device: every group plays the same map in a week. A link marked as
	received is someone else's plan; any other is the player's own, such as
	their address bar after a refresh.
	*/
	restore(fragment: string): void {
		this.linkError = undefined;
		this.received = undefined;
		try {
			const shared = decodeShareLink(fragment);
			if (shared?.received) {
				this.apply(shared, 'shared');
				this.received = this.ownFragment;
				return;
			}

			if (shared) {
				this.apply(shared, 'saved');
				return;
			}
		} catch (error) {
			if (!(error instanceof ShareLinkError)) {
				throw error;
			}

			this.linkError = error;
		}

		this.switchMap(mapOfWeek());
	}

	/**
	Shows another map, bringing back whatever was last set up on it.
	*/
	switchMap(map: GameMap): void {
		const saved = loadSaved().maps[map.id];
		let setup = blankSetup(map);
		try {
			const decoded = saved === undefined ? undefined : decodeShareLink(saved);
			if (decoded?.map === map) {
				setup = decoded;
			}
		} catch {
			// Saved by an incompatible version: start afresh.
		}

		this.apply(setup, 'saved');
	}

	/**
	The link to send someone, marked so they see it as a shared plan.
	*/
	shareUrl(): string {
		const fragment = encodeShareLink({...this.setup, received: true});
		return `${location.origin}${location.pathname}#${fragment}`;
	}

	/**
	Saves the setup and current plan on this device.
	*/
	persist(): void {
		this.saving.save(this.map.id, this.ownFragment);
		this.saving.flush();
	}

	/**
	Deletes everything saved on this device and starts afresh: a blank setup
	on every map, and the device's theme and language. The page reloads
	without its link, which holds the setup too.
	*/
	async forgetEverything(): Promise<void> {
		// A save still waiting would bring the setup back.
		this.saving.drop();
		await forgetAll();
		location.replace(location.pathname);
	}

	/**
	Keeps the address bar and saved data in step with the state, so a
	refresh or bookmark brings the setup back, and visits without a link
	bring back the player's own. A received setup becomes the player's own
	as soon as they change anything; until then it is never saved. Saving
	waits for a moment without changes (see `DelayedSave`), or for the page
	to be hidden or closed. Returns a stop function.
	*/
	sync(): () => void {
		const flush = () => {
			this.saving.flush();
		};

		const flushIfHidden = () => {
			if (document.visibilityState === 'hidden') {
				flush();
			}
		};

		addEventListener('pagehide', flush);
		document.addEventListener('visibilitychange', flushIfHidden);
		const stop = $effect.root(() => {
			$effect(() => {
				if (this.received !== undefined && this.ownFragment !== this.received) {
					this.received = undefined;
				}

				this.addressBar.show(this.address);
				if (this.received === undefined) {
					this.saving.save(this.map.id, this.ownFragment);
				}
			});
		});
		return () => {
			stop();
			removeEventListener('pagehide', flush);
			document.removeEventListener('visibilitychange', flushIfHidden);
			flush();
			this.addressBar.stop();
		};
	}

	/**
	Gives a town to a guild, or takes it back if the guild already has it.
	Ignored while the towns are locked (see `townLock`); stops a solve that
	has proven its plan, keeping that plan.
	*/
	toggleTown(id: string, guild: GuildIndex): void {
		if (this.townLock !== undefined) {
			return;
		}

		this.keepBestPlan();
		if (this.startingTowns[id] === guild) {
			const {[id]: _removed, ...rest} = this.startingTowns;
			this.startingTowns = rest;
		} else {
			this.startingTowns[id] = guild;
		}
	}

	/**
	Changes a guild's name as the player types it, keeping it to the game's
	length. Returns the name kept.
	*/
	setGuildName(guild: GuildIndex, name: string): string {
		const kept = cutGuildName(name);
		this.guildNames[guild] = kept;
		return kept;
	}

	/**
	Tidies a guild's name once the player has finished editing it.
	*/
	finishGuildName(guild: GuildIndex): void {
		this.guildNames[guild] = cleanGuildName(this.guildNames[guild] ?? '');
	}

	clearTowns(): void {
		if (this.townLock !== undefined) {
			return;
		}

		this.keepBestPlan();
		this.startingTowns = {};
	}

	/**
	Records how the next day actually went, as the position at its end, so
	the rest of the week can be planned from there. Ignored if it breaks
	the rules; `dayBetween` says how.
	*/
	recordDay(after: Ownership): void {
		const day = this.nextDay;
		if (day === undefined) {
			return;
		}

		const {declarations, violations} = dayBetween(this.map, this.history.at(-1)!, after, day);
		if (violations.length === 0) {
			this.played = [...this.played, declarations];
		}
	}

	/**
	Records the days from the next one to `lastDay` as the plan on screen
	has them, for when they all went to plan, so only a day that did not
	needs recording by hand. Ignored past `lastPlannedDay`.
	*/
	recordAsPlanned(lastDay: number): void {
		const {nextDay, lastPlannedDay, plannedWeek} = this;
		if (
			nextDay === undefined
			|| lastPlannedDay === undefined
			|| !plannedWeek
			|| lastDay < nextDay
			|| lastDay > lastPlannedDay
		) {
			return;
		}

		const {declarations} = planFromTimeline(this.map, plannedWeek.slice(nextDay - 1, lastDay + 1));
		this.played = [...this.played, ...declarations];
	}

	/**
	Forgets the last day recorded.
	*/
	forgetDay(): void {
		this.played = this.played.slice(0, -1);
	}

	/**
	Opens the setup again after a plan put it away.
	*/
	editSetup(): void {
		this.isSetupOpen = true;
	}

	setGoal(goal: Goal): void {
		this.goal = goal;
	}

	setFillMap(isOn: boolean): void {
		this.fillMap = isOn;
	}

	setCastleLast(isOn: boolean): void {
		this.castleLast = isOn;
	}

	/**
	Has a guild sit this Ragnarok out, or play again. Ignored when it would
	leave no guild playing.
	*/
	setSittingOut(guild: GuildIndex, isOut: boolean): void {
		const inactive = GUILDS.filter(g => (g === guild ? isOut : this.inactive.includes(g)));
		if (inactive.length < GUILD_COUNT) {
			this.inactive = inactive;
		}
	}

	setFewestDays(isOn: boolean): void {
		this.fewestDays = isOn;
	}

	/**
	Starts downloading the solver, unless the user asked to save data.
	*/
	warmUpSolver(): void {
		this.solving.warmUp();
	}

	async findPlan(): Promise<void> {
		if (!this.status.complete) {
			return;
		}

		// Planning makes a received setup the player's own.
		this.received = undefined;
		const {
			map, start, history, settings, inputs, result,
		} = this;
		// The plan on screen, carried on from the days played, is a good start
		// for the solver, most of all when planning the rest of the week.
		const hint = result && continuePlan(map, history, result.plan);
		const isSolved = await this.solving.run(
			{
				mapId: map.id, start, played: history.slice(1), settings, hint,
			},
			(owners, quality: PlanQuality) => {
				const plan = planFromTimeline(map, owners);
				const timeline = simulate(map, start, plan);
				const [violation] = timeline.violations;
				if (violation) {
					throw new Error(`The solver broke a rule: ${JSON.stringify(violation)}`);
				}

				// The model leaves guilds sitting out alone: anything else is a bug.
				const [disturbance] = disturbances(timeline, settings.inactive, history.length);
				if (disturbance) {
					throw new Error(`The solver disturbed a guild sitting out: ${JSON.stringify(disturbance)}`);
				}

				this.result = {
					plan, quality, start, settings, inputs,
				};
			},
		);
		if (isSolved) {
			this.isSetupOpen = false;
		}
	}

	/**
	Stops solving, keeping the best plan found so far.
	*/
	stop(): void {
		if (this.keepBestPlan()) {
			this.isSetupOpen = false;
		}
	}

	/**
	Abandons any running solve.
	*/
	cancel(): void {
		this.solving.cancel();
	}
}
