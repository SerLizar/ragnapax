<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<script lang="ts">
	import {onMount} from 'svelte';
	import {describeLinkError, describeQuality, mapName} from './i18n/describe.ts';
	import {
		aroundSlot,
		rich,
		SLOT,
		t,
	} from './i18n/i18n.svelte.ts';
	import type {Locale} from './i18n/locales.ts';
	import {findMap, MAPS} from './maps/index.ts';
	import {LANGUAGES, type LocaleState} from './state/locale.svelte.ts';
	import {PlannerState} from './state/planner.svelte.ts';
	import {ThemeState} from './state/theme.svelte.ts';
	import {UpdateState} from './state/update.svelte.ts';
	import {
		fallbackIn,
		keepFocus,
		RESULT_TITLE,
		SETUP_TITLE,
		SOLVE_CONTROL_SELECTOR,
	} from './ui/focus.ts';
	import GoalCard from './ui/GoalCard.svelte';
	import Icon from './ui/Icon.svelte';
	import PrivacyNotice from './ui/PrivacyNotice.svelte';
	import RecordCard from './ui/RecordCard.svelte';
	import ResultCard from './ui/ResultCard.svelte';
	import Rich from './ui/Rich.svelte';
	import SetupCard from './ui/SetupCard.svelte';
	import ThemeSwitch from './ui/ThemeSwitch.svelte';

	let {locale}: {locale: LocaleState} = $props();

	const planner = new PlannerState();
	const theme = new ThemeState();
	const update = new UpdateState();
	planner.restore(location.hash);

	onMount(() => {
		// Someone who has a full setup is likely to plan soon: fetch the solver.
		if (planner.status.complete && !planner.openedFromLink) {
			planner.warmUpSolver();
		}

		// A share link pasted into an already open tab.
		const reload = () => {
			if (!location.hash) {
				return;
			}

			planner.restore(location.hash);
		};

		addEventListener('hashchange', reload);
		return () => removeEventListener('hashchange', reload);
	});

	onMount(() => planner.sync());
	onMount(() =>
		keepFocus(document.body, {
			// The plan a solve control started from, to tell when the solve made a new one.
			snapshot: () => (planner.solve.phase === 'solving' ? planner.result : false),
			pick({card, snapshot}) {
				const find = (selector: string) => document.querySelector<HTMLElement>(selector) ?? undefined;
				// A button that started solving gives way to the progress.
				if (planner.solve.phase === 'solving') {
					return find(SOLVE_CONTROL_SELECTOR);
				}

				// A solve that ended with a plan leads to it.
				if (snapshot !== false && planner.result !== snapshot) {
					return find(`#${RESULT_TITLE}`);
				}

				return card ? fallbackIn(card) : find(`#${planner.isSetupOpen ? SETUP_TITLE : RESULT_TITLE}`);
			},
		}));
	onMount(() => theme.start());
	onMount(() => locale.start());
	onMount(() => update.start());

	// The solver's files may be gone because a new version replaced them.
	$effect(() => {
		if (planner.solve.phase === 'failed' && planner.solve.reason === 'unavailable') {
			update.check();
		}
	});

	const source = $derived(aroundSlot(t('footer.source', {link: SLOT})));
	const licences = $derived(aroundSlot(t('footer.licences', {link: SLOT})));

	// Says when a plan is ready, wherever focus is: the progress that
	// announced each step is gone by then.
	let announcement = $state('');
	/**
	The plan when the running solve started; false when not solving.
	*/
	let solvedFrom: PlannerState['result'] | false = false;
	$effect(() => {
		const {result} = planner;
		if (planner.solve.phase === 'solving') {
			if (solvedFrom === false) {
				solvedFrom = result;
				announcement = '';
			}

			return;
		}

		// A cancelled solve leaves the plan as it was.
		if (solvedFrom !== false && result && result !== solvedFrom) {
			announcement = t('solve.done', {
				summary: describeQuality(result.quality, result.settings),
			});
		}

		solvedFrom = false;
	});
</script>

<header class="topbar">
	<img class="logo" src="./icon.svg" alt="" width="32" height="32" />
	<h1>Ragnapax</h1>
	<div class="pickers">
		<label class="picker">
			<Icon name="map" />
			<span class="visually-hidden">{t('header.map')}</span>
			<select
				value={planner.map.id}
				onchange={event => planner.switchMap(findMap(event.currentTarget.value)!)}
			>
				{#each MAPS as m (m.id)}
					<option value={m.id}>{mapName(m)}</option>
				{/each}
			</select>
		</label>
		{#if LANGUAGES.length > 1}
			<label class="picker">
				<Icon name="globe" />
				<span class="visually-hidden">{t('header.language')}</span>
				<select
					value={locale.locale}
					onchange={event => locale.choose(event.currentTarget.value as Locale)}
				>
					{#each LANGUAGES as language (language.code)}
						<option value={language.code} lang={language.code}>{language.name}</option>
					{/each}
				</select>
			</label>
		{/if}
	</div>
	<div class="theme"><ThemeSwitch {theme} /></div>
</header>

<main class="shell">
	<p class="visually-hidden" role="status">{announcement}</p>
	{#if update.available}
		<div class="banner" role="status">
			<Icon name="reset" />
			<p>{t('update.ready')}</p>
			<button class="btn small" onclick={() => update.reload()}>{t('update.reload')}</button>
		</div>
	{/if}

	{#if planner.linkError}
		<div class="banner" role="alert">
			<Icon name="alert" />
			<p>{describeLinkError(planner.linkError)} {t('link.fallback')}</p>
			<button class="btn small ghost" onclick={() => (planner.linkError = undefined)}>
				{t('link.dismiss')}
			</button>
		</div>
	{/if}

	<div class="columns" class:single={!planner.isSetupOpen}>
		<div class="column">
			{#if planner.isSetupOpen}
				<SetupCard {planner} />
				<GoalCard {planner} />
			{:else}
				<section class="card shared-intro">
					<h2>{mapName(planner.map)}</h2>
					<p class="sub">{t(planner.isReceived ? 'shared.intro' : 'planned.intro')}</p>
					<button class="btn" onclick={() => planner.editSetup()}>{t('shared.edit')}</button>
				</section>
			{/if}
		</div>

		<div class="column results">
			{#if planner.result}
				<ResultCard {planner} />
			{:else}
				<section class="card placeholder">
					<ol>
						<li><Rich parts={rich('intro.name')} /></li>
						<li><Rich parts={rich('intro.goal')} /></li>
						<li><Rich parts={rich('intro.plan')} /></li>
					</ol>
					<p class="sub">{t('intro.private')}</p>
				</section>
			{/if}
			{#if planner.status.complete && (planner.result || planner.played.length > 0)}
				<RecordCard {planner} showProgress={!planner.isSetupOpen} />
			{/if}
		</div>
	</div>
</main>

<footer class="footer">
	<p>
		{t('footer.licence')}
		{#if __SOURCE_URL__}
			{source[0]}<a href={__SOURCE_URL__}>{t('footer.sourceLink')}</a>{source[1]}
		{/if}
		<!-- Written by the build (see vite.config.ts). -->
		{licences[0]}<a href="./licenses.txt">{t('footer.licencesLink')}</a>{licences[1]}
		{t('footer.disclaimer')}
		{t('footer.version', {version: __APP_VERSION__})}
	</p>
	<PrivacyNotice {planner} />
</footer>

<style>
	.topbar {
		display: grid;
		grid-template-columns: auto 1fr auto;
		grid-template-areas:
			'logo title theme'
			'logo picker theme';
		align-items: center;
		gap: 8px 12px;
		max-width: 1200px;
		margin: 0 auto;
		padding: calc(16px + env(safe-area-inset-top)) var(--space) 8px;
	}

	/* On phones the pickers get a row of their own, clear of the theme switch. */
	@media (max-width: 419px) {
		.topbar {
			grid-template-areas:
				'logo title theme'
				'picker picker picker';
		}
	}

	/* With larger text the title needs the logo's room, or it breaks
	mid-word. In em, so the width follows the player's text size: at the
	default 16 px the logo shows down to 300 px wide. */
	@media (max-width: 18em) {
		.topbar {
			grid-template-columns: 1fr auto;
			grid-template-areas:
				'title theme'
				'picker picker';
		}

		.logo {
			display: none;
		}
	}

	.logo {
		grid-area: logo;
		border-radius: 8px;
	}

	/* Once the pickers fit on one row beside it, the logo fills the header's two rows. */
	@media (min-width: 640px) {
		.logo {
			width: 64px;
			height: 64px;
			border-radius: 16px;
		}
	}

	h1 {
		grid-area: title;
		min-width: 0;
		font-size: 1.15rem;
		letter-spacing: -0.01em;
	}

	.theme {
		grid-area: theme;
	}

	.pickers {
		grid-area: picker;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		min-width: 0;
	}

	.picker {
		min-width: 0;
		max-width: 100%;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		color: var(--muted);
		font-size: 0.85rem;
		font-weight: 600;
	}

	.picker :global(svg) {
		flex: none;
		width: 16px;
		height: 16px;
	}

	.picker select {
		min-width: 0;
		max-width: 100%;
		min-height: 32px;
		padding: 0 8px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		font-weight: 600;
	}

	.shell {
		max-width: 1200px;
		margin: 0 auto;
		padding: 8px var(--space) var(--space);
	}

	.columns {
		display: grid;
		gap: var(--space);
	}

	.column {
		display: grid;
		gap: var(--space);
		align-content: start;
		min-width: 0;
	}

	.columns.single {
		max-width: 720px;
		margin: 0 auto;
	}

	@media (min-width: 960px) {
		.columns:not(.single) {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-items: start;
		}

		.results {
			position: sticky;
			top: var(--space);
		}
	}

	.banner {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: var(--space);
		padding: 12px 16px;
		border-radius: var(--radius);
		background: var(--warning-soft);
		color: var(--warning);
		font-weight: 600;
	}

	.banner p {
		flex: 1;
		margin: 0;
	}

	.banner > :global(svg) {
		flex: none;
		width: 20px;
		height: 20px;
	}

	.shared-intro {
		display: grid;
		gap: 8px;
		justify-items: start;
	}

	.placeholder ol {
		display: grid;
		gap: 12px;
		margin: 0 0 12px;
		padding-inline-start: 1.4em;
	}

	.placeholder li::marker {
		color: var(--accent);
		font-weight: 700;
	}

	.footer {
		max-width: 1200px;
		margin: 0 auto;
		padding: 8px var(--space) calc(24px + env(safe-area-inset-bottom));
		color: var(--muted);
		font-size: 0.8rem;
		text-align: center;
	}

	.footer a {
		color: inherit;
	}
</style>
