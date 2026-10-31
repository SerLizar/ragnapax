<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<!--
  The options under "Advanced options" in the goal card: holdings set by
  hand, fewer days with declares, guilds sitting out, and starting towns
  set from lists.
-->
<script lang="ts">
	import {activeGuilds} from '../domain/settings.ts';
	import {KINGDOM_KINDS, type GuildIndex, type KingdomKind} from '../domain/types.ts';
	import {t} from '../i18n/i18n.svelte.ts';
	import type {PlannerState} from '../state/planner.svelte.ts';
	import GuildMark from './GuildMark.svelte';
	import Icon from './Icon.svelte';
	import Switch from './Switch.svelte';

	let {planner}: {planner: PlannerState} = $props();
	const id = $props.id();

	const playing = $derived(activeGuilds(planner.settings).length);

	// The score table's column names, which the holdings table shares.
	const COLUMN: Record<KingdomKind, 'town' | 'dorm' | 'castle'> = {
		town: 'town',
		dormitory: 'dorm',
		castle: 'castle',
	};
	const isExcess = (kind: KingdomKind) => planner.excessTargets.some(excess => excess.kind === kind);

	// Kept as typed, then shown as kept once the field is left: a whole
	// number the map allows.
	function setDays(event: Event & {currentTarget: HTMLInputElement}, g: GuildIndex, kind: KingdomKind) {
		const input = event.currentTarget;
		planner.setTarget(g, kind, input.valueAsNumber);
		if (event.type === 'change') {
			input.value = String(planner.targets?.[g]?.[kind] ?? '');
		}
	}
</script>

<Switch
	--switch-margin="8px 0 16px"
	checked={planner.targets !== undefined}
	title={t('advanced.targets')}
	description={t('advanced.targets.description')}
	onchange={isOn => planner.setTargets(isOn)}
/>
{#if planner.targets}
	{@const {targets} = planner}
	<table class="targets" aria-label={t('advanced.targets')}>
		<thead>
			<tr>
				<th scope="col" class="name">{t('score.guild')}</th>
				{#each KINGDOM_KINDS as kind (kind)}
					<th scope="col">
						<abbr title={t(`score.${COLUMN[kind]}Long`)} aria-hidden="true">
							{t(`score.${COLUMN[kind]}Short`)}
						</abbr><span class="visually-hidden">{t(`score.${COLUMN[kind]}Long`)}</span>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each planner.displayNames as name, g (g)}
				{@const isOut = planner.inactive.includes(g)}
				<tr>
					<th scope="row" class="name">
						<span class="who">
							<GuildMark guild={g} />
							<span class="text">
								{name}
								{#if isOut}
									<span class="out">{t('score.inactive')}</span>
								{/if}
							</span>
						</span>
					</th>
					{#each KINGDOM_KINDS as kind (kind)}
						<td>
							<input
								type="number"
								inputmode="numeric"
								min="0"
								max={planner.map.mostHeld[kind]}
								step="1"
								value={targets[g]?.[kind]}
								disabled={isOut}
								aria-label={t('advanced.targets.field', {
									kind: t(`score.${COLUMN[kind]}Long`),
									guild: name,
								})}
								aria-invalid={isExcess(kind) && !isOut}
								aria-describedby={isExcess(kind) ? `${id}-excess-${kind}` : undefined}
								oninput={event => setDays(event, g, kind)}
								onchange={event => setDays(event, g, kind)}
							/>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	{#each planner.excessTargets as excess (excess.kind)}
		<p class="notice danger" id="{id}-excess-{excess.kind}" role="alert">
			<Icon name="alert" />
			{t('advanced.targets.tooMany', {
				kind: t(`score.${COLUMN[excess.kind]}Long`),
				count: excess.count,
				most: excess.most,
			})}
		</p>
	{/each}
	<button class="btn small reset" onclick={() => planner.setTargets(true)}>
		{t('advanced.targets.reset')}
	</button>
{/if}
<Switch
	--switch-margin="8px 0 16px"
	checked={planner.fewestDays}
	title={t('advanced.fewestDays')}
	description={t('advanced.fewestDays.description')}
	onchange={isOn => planner.setFewestDays(isOn)}
/>
<fieldset class="sitting-out" aria-describedby="{id}-out-desc">
	<legend class="title">{t('advanced.inactive')}</legend>
	<p class="desc" id="{id}-out-desc">{t('advanced.inactive.description')}</p>
	{#each planner.displayNames as name, g (g)}
		{@const isOut = planner.inactive.includes(g)}
		<Switch
			--switch-margin="0"
			checked={isOut}
			disabled={!isOut && playing === 1}
			onchange={isOn => planner.setSittingOut(g, isOn)}
		>
			{#snippet title()}
				<span class="guild"><GuildMark guild={g} /> {name}</span>
			{/snippet}
		</Switch>
	{/each}
	{#if playing === 1}
		<p class="desc">{t('advanced.inactive.last')}</p>
	{/if}
</fieldset>
<!-- The player's own preference rather than the group's, so it never
opens the options by itself. -->
<Switch
	--switch-margin="16px 0 0"
	checked={planner.townLists}
	title={t('advanced.townLists')}
	description={t('advanced.townLists.description')}
	onchange={isOn => planner.setTownLists(isOn)}
/>

<style>
	.targets {
		width: 100%;
		margin: -8px 0 8px;
		border-collapse: collapse;
		color: var(--text);
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
	}

	.targets th,
	.targets td {
		padding-block: 4px;
		padding-inline: 4px 0;
		text-align: end;
		white-space: nowrap;
	}

	.targets thead th {
		color: var(--muted);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.targets abbr {
		text-decoration: none;
	}

	/* The name column takes the room the fields leave, down to nothing. */
	.targets .name {
		width: 100%;
		max-width: 0;
		padding-inline-start: 0;
		text-align: start;
	}

	.who {
		display: flex;
		gap: 8px;
		align-items: center;
		font-weight: 600;
	}

	.who .text {
		min-width: 0;
		overflow-wrap: anywhere;
		white-space: normal;
	}

	.out {
		display: block;
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 400;
	}

	.targets input {
		width: 48px;
		min-height: 40px;
		padding-inline: 4px;
		border: 2px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		text-align: end;
		appearance: textfield;
		-moz-appearance: textfield;
	}

	/* No spinners: they leave no room for the digits. */
	.targets input::-webkit-inner-spin-button,
	.targets input::-webkit-outer-spin-button {
		margin: 0;
		appearance: none;
		-webkit-appearance: none;
	}

	.targets input:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.targets input[aria-invalid='true'] {
		border-color: var(--danger);
	}

	.notice {
		margin: 0 0 8px;
		font-size: 0.9rem;
	}

	.reset {
		margin: 0 0 8px;
	}

	.sitting-out {
		display: grid;
		gap: 8px;
		min-inline-size: 0;
		margin: 8px 0 0;
		padding: 0;
		border: 0;
		color: var(--text);
		font-size: 1rem;
	}

	.sitting-out legend {
		padding: 0;
	}

	.sitting-out p {
		margin: 0;
	}

	.title {
		font-weight: 700;
	}

	.desc {
		color: var(--muted);
		font-size: 0.9rem;
	}

	.guild {
		display: flex;
		gap: 8px;
		align-items: center;
		min-width: 0;
		overflow-wrap: anywhere;
	}
</style>
