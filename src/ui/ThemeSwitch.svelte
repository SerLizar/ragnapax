<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<script lang="ts">
	import {t} from '../i18n/i18n.svelte.ts';
	import {THEME_PREFERENCES, type ThemePreference, type ThemeState} from '../state/theme.svelte.ts';
	import Icon, {type IconName} from './Icon.svelte';

	let {theme}: {theme: ThemeState} = $props();

	const OPTIONS: Record<ThemePreference, {icon: IconName; label: `theme.${ThemePreference}`}> = {
		system: {icon: 'system', label: 'theme.system'},
		light: {icon: 'sun', label: 'theme.light'},
		dark: {icon: 'moon', label: 'theme.dark'},
	};

	/**
	A radio group as screen readers expect it: one stop on the Tab key, and
	arrow keys move the choice.
	*/
	function keydown(event: KeyboardEvent) {
		const step = {
			ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1,
		}[event.key];
		if (step === undefined) {
			return;
		}

		event.preventDefault();
		const count = THEME_PREFERENCES.length;
		const next = (THEME_PREFERENCES.indexOf(theme.preference) + step + count) % count;
		theme.choose(THEME_PREFERENCES[next]!);
		(event.currentTarget as HTMLElement).querySelectorAll('button')[next]?.focus();
	}
</script>

<div class="switch" role="radiogroup" aria-label={t('theme.title')} tabindex="-1" onkeydown={keydown}>
	{#each THEME_PREFERENCES as preference (preference)}
		<button
			role="radio"
			aria-checked={theme.preference === preference}
			tabindex={theme.preference === preference ? 0 : -1}
			aria-label={t(OPTIONS[preference].label)}
			title={t(OPTIONS[preference].label)}
			onclick={() => theme.choose(preference)}
		>
			<Icon name={OPTIONS[preference].icon} />
		</button>
	{/each}
</div>

<style>
	.switch {
		display: inline-flex;
		flex: none;
		padding: 4px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
	}

	button {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--muted);
	}

	button[aria-checked='true'] {
		background: var(--accent-soft);
		color: var(--accent);
	}

	@media (forced-colors: active) {
		button[aria-checked='true'] {
			forced-color-adjust: none;
			background: Highlight;
			color: HighlightText;
		}
	}

	button :global(svg) {
		width: 20px;
		height: 20px;
	}
</style>
