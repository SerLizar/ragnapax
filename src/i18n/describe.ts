// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// The game's things in the player's language. The domain works with ids and
// data; everything a player reads about them is worded here.

import type {GameMap, Kingdom} from '../domain/map.ts';
import type {Disturbance, Violation} from '../domain/plan.ts';
import type {
	Criterion,
	Effort,
	Goal,
	PlanSettings,
} from '../domain/settings.ts';
import {DAYS, MAX_DECLARATIONS_PER_DAY, type GuildIndex} from '../domain/types.ts';
import type {Dormitory} from '../maps/kingdoms.ts';
import type {LinkProblem, ShareLinkError} from '../share/link.ts';
import type {SolvePhase} from '../state/planner.svelte.ts';
import type {ResultQuality} from '../state/storage.ts';
import type {MessageKey} from './catalogue.ts';
import {t, weekday} from './i18n.svelte.ts';

/**
A map's name; `describe.test.ts` checks every map has one.
*/
export const mapName = (map: Pick<GameMap, 'id'>): string =>
	t(`map.${map.id}` as Extract<MessageKey, `map.${string}`>);

/**
A kingdom's full name, e.g. "Town A" or "Dionysia".
*/
export function kingdomName(kingdom: Pick<Kingdom, 'id' | 'kind'>): string {
	switch (kingdom.kind) {
		case 'town': {
			return t('town.name', {letter: kingdom.id});
		}

		case 'dormitory': {
			return t(`dorm.${kingdom.id as Dormitory}`);
		}

		case 'castle': {
			return t('castle.name');
		}
	}
}

/**
The short name drawn inside a kingdom's marker, e.g. "A" or "Dio".
*/
export function kingdomLabel(kingdom: Pick<Kingdom, 'id' | 'kind' | 'label'>): string {
	switch (kingdom.kind) {
		case 'town': {
			return kingdom.label;
		}

		case 'dormitory': {
			return t(`dorm.${kingdom.id as Dormitory}.short`);
		}

		case 'castle': {
			return t('castle.short');
		}
	}
}

/**
Full and short names of every kingdom on a map, by index, for drawing it.
*/
export const kingdomTexts = (map: GameMap) =>
	map.kingdoms.map(kingdom => ({
		name: kingdomName(kingdom),
		label: kingdomLabel(kingdom),
	}));

export const defaultGuildName = (guild: GuildIndex): string =>
	t('guild.default', {number: guild + 1});

export const goalLabel = (goal: Goal): string => t(`goal.${goal}`);

/**
What a priority means, e.g. "Smallest gap in castle-days between guilds".
*/
export const describeCriterion = (criterion: Criterion): string =>
	t(criterion.kind === 'total' ? 'ranking.total' : `ranking.gap.${criterion.measure}`);

/**
A tie-breaker on the work a plan asks for, e.g. "Fewest declares".
*/
export const describeEffort = (effort: Effort): string => t(`ranking.${effort}`);

/**
What is known about a plan's quality, e.g. "The fairest plan possible…",
for the settings it was made with.
*/
export function describeQuality(
	quality: ResultQuality,
	{fillMap, fewestDays}: Pick<PlanSettings, 'fillMap' | 'fewestDays'>,
): string {
	switch (quality) {
		case 'optimal': {
			return fewestDays
				? t(fillMap ? 'result.optimal.fillMap.fewestDays' : 'result.optimal.fewestDays')
				: t(fillMap ? 'result.optimal.fillMap' : 'result.optimal');
		}

		case 'proven': {
			return t(fillMap ? 'result.proven.fillMap' : 'result.proven');
		}

		case 'unproven': {
			return t('result.unproven');
		}

		case 'saved': {
			return t('result.saved');
		}

		case 'shared': {
			return t('result.shared');
		}
	}
}

/**
Why no plan came out of a solve.
*/
export const describeFailure = (failure: Extract<SolvePhase, {phase: 'failed'}>): string =>
	failure.reason === 'error'
		? t('solve.error', {detail: failure.detail ?? ''})
		: t(`solve.${failure.reason}`);

/**
A broken rule in words. `guildNames` are the names to use, when the plan
has them; otherwise guilds are "Guild 1" and so on.
*/
export function describeViolation(
	map: GameMap,
	violation: Violation,
	guildNames: readonly string[] = [],
): string {
	if (violation.rule === 'days') {
		return t('rule.days', {count: violation.days, days: DAYS});
	}

	const guild = (g: GuildIndex) => {
		const name = guildNames[g] ?? '';
		return name === '' ? defaultGuildName(g) : name;
	};

	const day = weekday(violation.day, 'long');
	switch (violation.rule) {
		case 'guilds': {
			return t('rule.guilds', {day});
		}

		case 'limit': {
			return t('rule.limit', {
				day,
				guild: guild(violation.guild),
				count: violation.count,
				max: MAX_DECLARATIONS_PER_DAY,
			});
		}

		case 'unknown': {
			return t('rule.unknown', {day, guild: guild(violation.guild)});
		}

		case 'contested': {
			return t('rule.contested', {
				day,
				guild: guild(violation.guild),
				rival: guild(violation.rival),
				kingdom: kingdomName(map.kingdoms[violation.kingdom]!),
			});
		}

		case 'held':
		case 'adjacent':
		case 'twice': {
			return t(`rule.${violation.rule}`, {
				day,
				guild: guild(violation.guild),
				kingdom: kingdomName(map.kingdoms[violation.kingdom]!),
			});
		}
	}
}

/**
A declare that does not leave a guild sitting out alone, in words, with
the guilds' names.
*/
export function describeDisturbance(
	map: GameMap,
	disturbance: Disturbance,
	guildNames: readonly string[],
): string {
	const day = weekday(disturbance.day, 'long');
	const guild = guildNames[disturbance.guild] ?? '';
	const kingdom = kingdomName(map.kingdoms[disturbance.kingdom]!);
	return disturbance.kind === 'declares'
		? t('result.sittingOutDeclares', {day, guild, kingdom})
		: t('result.sittingOutAttacked', {
			day, guild, kingdom, rival: guildNames[disturbance.rival] ?? '',
		});
}

/**
Why a share link could not be opened.
*/
export function describeLinkError(error: ShareLinkError): string {
	if (!error.broken) {
		return t(`link.${error.problem as Exclude<LinkProblem, 'rules'>}`);
	}

	const {map, violation} = error.broken;
	return t('link.rules', {problem: describeViolation(map, violation)});
}
