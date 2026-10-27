<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<!--
The privacy notice the GDPR asks for, folded away in the footer. See
"Privacy" in docs/PRIVACY.md for what it rests on.
-->
<script lang="ts">
	import {
		aroundSlot,
		rich,
		SLOT,
		t,
	} from '../i18n/i18n.svelte.ts';
	import type {PlannerState} from '../state/planner.svelte.ts';
	import Rich from './Rich.svelte';

	let {planner}: {planner: PlannerState} = $props();

	/**
	Who runs the site, which a privacy notice must say. Publishing a fork, or
	on another host? Put your own name here, and fix `privacy.host*` in
	`src/i18n/en.ts` to match your host.
	*/
	const OPERATOR = 'SerLizar';
	const GITHUB_PRIVACY = 'https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement';
	const GITHUB_RETENTION = `${GITHUB_PRIVACY}#security-and-retention`;

	const contact = $derived(aroundSlot(t('privacy.contact', {link: SLOT})));
	const hostMore = $derived(aroundSlot(t('privacy.hostMore', {link: SLOT})));
	const retention = $derived(aroundSlot(t('privacy.hostRetention', {link: SLOT})));

	async function forget() {
		// eslint-disable-next-line no-alert -- a plain, accessible question before deleting a week's plan
		if (confirm(t('privacy.forget.confirm'))) {
			await planner.forgetEverything();
		}
	}
</script>

<details class="privacy">
	<summary>{t('privacy.title')}</summary>
	<div class="body">
		<p><Rich parts={rich('privacy.summary')} /> {t('privacy.summaryMore')}</p>
		<p>
			{t('privacy.operator', {name: OPERATOR})}
			{#if __SOURCE_URL__}
				{contact[0]}<a href="{__SOURCE_URL__}/issues">{t('privacy.contactLink')}</a>{contact[1]}
			{/if}
		</p>
		<p><Rich parts={rich('privacy.onDevice')} /> {t('privacy.deviceMore')}</p>
		<p><Rich parts={rich('privacy.links')} /> {t('privacy.linksMore')}</p>
		<p>
			<Rich parts={rich('privacy.host')} />
			{t('privacy.hostLogs')}
			{retention[0]}<a href={GITHUB_RETENTION}>{t('privacy.hostRetentionLink')}</a>{retention[1]}
			{hostMore[0]}<a href={GITHUB_PRIVACY}>{t('privacy.hostLink')}</a>{hostMore[1]}
		</p>
		<p><Rich parts={rich('privacy.rights')} /> {t('privacy.rightsMore')}</p>
		<button class="btn small ghost" onclick={forget}>{t('privacy.forget')}</button>
	</div>
</details>

<style>
	.privacy {
		margin-top: 8px;
	}

	summary {
		width: fit-content;
		margin: 0 auto;
		padding: 4px 0;
		color: var(--accent);
		font-weight: 600;
		cursor: pointer;
	}

	.body {
		max-width: 640px;
		margin: 8px auto 0;
		text-align: start;
	}

	p {
		margin: 0 0 8px;
	}

	a {
		color: inherit;
	}
</style>
