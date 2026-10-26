// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {GameMap} from '../domain/map.ts';
import {capturesOn, score, type Timeline} from '../domain/plan.ts';
import type {Goal} from '../domain/settings.ts';
import {VACANT, type GuildIndex} from '../domain/types.ts';
import {goalLabel, mapName, kingdomName} from '../i18n/describe.ts';
import {t, weekday} from '../i18n/i18n.svelte.ts';

export type PlanTextOptions = {
	readonly map: GameMap;
	readonly guildNames: readonly string[];
	readonly goal: Goal;
	readonly fillMap: boolean;
	readonly castleLast: boolean;
	readonly inactive: readonly GuildIndex[];
	readonly fewestDays: boolean;
	readonly timeline: Timeline;
	/**
	Only list this guild's declarations.
	*/
	readonly guild?: GuildIndex;
};

/**
What Discord reads as formatting, links or mentions. Guild names come in
links from strangers, and a guild called "@everyone" would otherwise ping a
whole server when the plan is pasted, or "~~x~~" restyle it.
*/
const CHAT_SYNTAX = /[*<@[\\\]_`|~]/gu;

/**
A guild name as plain text in chat: Discord shows a character after a
backslash as it is, and hides the backslash. Most names have none of
these characters, so they read the same in the game's own chat.
*/
export const forChat = (name: string): string => name.replaceAll(CHAT_SYNTAX, String.raw`\$&`);

/**
Formats a plan as plain text for pasting into game or Discord chat.
*/
export function planToText({
	map,
	guildNames: names,
	goal,
	fillMap,
	castleLast,
	inactive,
	fewestDays,
	timeline,
	guild,
}: PlanTextOptions): string {
	const guildNames = names.map(name => forChat(name));
	const title = [
		mapName(map),
		goalLabel(goal),
		...(fillMap ? [t('goal.fillMap')] : []),
		...(fillMap && castleLast ? [t('goal.castleLast')] : []),
		...(fewestDays ? [t('advanced.fewestDays')] : []),
	];
	const lines = [
		title.join(' · '),
		...(guild === undefined ? [] : [t('text.declaresFor', {guild: guildNames[guild]!})]),
		...(guild === undefined && inactive.length > 0
			? [t('text.inactive', {guilds: inactive.map(g => guildNames[g]!).join(t('list.separator'))})]
			: []),
	];

	// Guilds sitting out are named once above rather than with no declares
	// every day, and their points are not part of the share.
	const guilds = guild === undefined ? guildNames.map((_, g) => g).filter(g => !inactive.includes(g)) : [guild];

	for (let day = 1; day < timeline.owners.length; day++) {
		const captures = capturesOn(timeline, day);
		lines.push('', weekday(day, 'long'));
		// Days played before a guild sat out may have its declares.
		const declaring = guild === undefined ? inactive.filter(g => captures.some(c => c.guild === g)) : [];
		for (const g of [...guilds, ...declaring].toSorted((a, b) => a - b)) {
			const targets = captures
				.filter(c => c.guild === g)
				.map(c => {
					const kingdom = kingdomName(map.kingdoms[c.kingdom]!);
					return c.from === VACANT
						? kingdom
						: t('text.from', {kingdom, guild: guildNames[c.from]!});
				});
			const moves = targets.length > 0 ? targets.join(t('list.separator')) : t('text.none');
			lines.push(
				'• ' + (guild === undefined ? t('text.moves', {guild: guildNames[g]!, moves}) : moves),
			);
		}
	}

	const scores = score(map, timeline);
	const points = guilds.map(g =>
		t('text.score', {guild: guildNames[g]!, points: scores[g]!.points}),
	);
	lines.push('', t('text.points', {scores: points.join(' · ')}));
	return lines.join('\n');
}
