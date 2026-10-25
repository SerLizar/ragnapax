// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
	GUILD_COUNT,
	KINGDOM_KINDS,
	TOWNS_PER_GUILD,
	type MapDefinition,
	type KingdomIndex,
	type KingdomKind,
} from './types.ts';

/**
A kingdom with everything derived from the map definition resolved.
*/
export type Kingdom = {
	readonly index: KingdomIndex;
	readonly id: string;
	readonly name: string;
	readonly label: string;
	readonly kind: KingdomKind;
	readonly x: number;
	readonly y: number;
	/**
	Indices of adjacent kingdoms, ascending.
	*/
	readonly neighbors: readonly KingdomIndex[];
};

/**
A validated, indexed map ready for planning and rendering.
*/
export type GameMap = {
	readonly id: string;
	readonly name: string;
	readonly kingdoms: readonly Kingdom[];
	/**
	Town indices in map order: the kingdoms guilds can start on.
	*/
	readonly towns: readonly KingdomIndex[];
	readonly roads: ReadonlyArray<readonly [KingdomIndex, KingdomIndex]>;
	/**
	Kingdom indices in the order share links use: towns, then dorms, then
	the castle, each kind by id. Links depend on the ids alone, while indices
	keep the map file's order, which the solver's speed depends on.
	*/
	readonly linkOrder: readonly KingdomIndex[];
	indexOf(id: string): KingdomIndex | undefined;
};

/**
Most kingdoms a map may have: share links use one character each.
*/
export const MAX_KINGDOMS = 62;

export class MapDefinitionError extends Error {
	constructor(mapId: string, problems: readonly string[]) {
		super(`Map "${mapId}" is invalid:\n- ${problems.join('\n- ')}`);
		this.name = 'MapDefinitionError';
	}
}

/**
Checks a definition for mistakes, returning human-readable problems.
*/
export function findMapProblems(def: MapDefinition): string[] {
	const problems: string[] = [];
	const ids = new Set<string>();
	for (const t of def.kingdoms) {
		if (ids.has(t.id)) {
			problems.push(`Duplicate kingdom id "${t.id}".`);
		}

		ids.add(t.id);
		if (!Number.isFinite(t.x) || !Number.isFinite(t.y)) {
			problems.push(`Kingdom "${t.id}" has no position.`);
		}
	}

	const seen = new Set<string>();
	for (const [a, b] of def.roads) {
		for (const end of [a, b]) {
			if (!ids.has(end)) {
				problems.push(`Road ${a}–${b} references unknown "${end}".`);
			}
		}

		if (a === b) {
			problems.push(`Road ${a}–${b} connects a kingdom to itself.`);
		}

		const key = [a, b].toSorted().join('\u{0}');
		if (seen.has(key)) {
			problems.push(`Road ${a}–${b} is listed twice.`);
		}

		seen.add(key);
	}

	const connected = new Set<string>(def.roads.flat());
	for (const id of ids) {
		if (!connected.has(id)) {
			problems.push(`Kingdom "${id}" has no roads.`);
		}
	}

	const count = (kind: KingdomKind) => def.kingdoms.filter(t => t.kind === kind).length;
	if (def.kingdoms.length > MAX_KINGDOMS) {
		problems.push(`A map can have at most ${MAX_KINGDOMS} kingdoms.`);
	}

	if (GUILD_COUNT * TOWNS_PER_GUILD > count('town')) {
		problems.push(
			`${GUILD_COUNT} guilds × ${TOWNS_PER_GUILD} towns need more than the ${count('town')} towns available.`,
		);
	}

	if (count('castle') !== 1) {
		problems.push('A map has exactly one castle.');
	}

	return problems;
}

/**
Validates and indexes a map definition.
*/
export function compileMap(def: MapDefinition): GameMap {
	const problems = findMapProblems(def);
	if (problems.length > 0) {
		throw new MapDefinitionError(def.id, problems);
	}

	const indexById = new Map(def.kingdoms.map((t, i) => [t.id, i]));
	const index = (id: string) => indexById.get(id)!;
	const neighbors = def.kingdoms.map(() => new Set<KingdomIndex>());
	const roads = def.roads.map(([a, b]) => {
		neighbors[index(a)]!.add(index(b));
		neighbors[index(b)]!.add(index(a));
		return [index(a), index(b)] as const;
	});

	const kingdoms: Kingdom[] = def.kingdoms.map((t, i) => ({
		index: i,
		id: t.id,
		name: t.name,
		label: t.label,
		kind: t.kind,
		x: t.x,
		y: t.y,
		neighbors: [...neighbors[i]!].toSorted((a, b) => a - b),
	}));
	const towns = kingdoms.filter(t => t.kind === 'town').map(t => t.index);
	const rank = (t: Kingdom) => KINGDOM_KINDS.indexOf(t.kind);
	const linkOrder = kingdoms
		.toSorted((a, b) => (rank(a) === rank(b) ? (a.id < b.id ? -1 : 1) : rank(a) - rank(b)))
		.map(t => t.index);

	return {
		id: def.id,
		name: def.name,
		kingdoms,
		towns,
		roads,
		linkOrder,
		indexOf: id => indexById.get(id),
	};
}
