<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<script lang="ts">
	import {t} from '../i18n/i18n.svelte.ts';
	import type {PlannerState} from '../state/planner.svelte.ts';
	import {solveControl} from './focus.ts';
	import Icon from './Icon.svelte';

	let {planner}: {planner: PlannerState} = $props();

	let now = $state(performance.now());
	$effect(() => {
		const timer = setInterval(() => (now = performance.now()), 250);
		return () => clearInterval(timer);
	});

	const solve = $derived(planner.solve.phase === 'solving' ? planner.solve : undefined);
	const seconds = $derived(solve ? Math.max(0, Math.floor((now - solve.startedAt) / 1000)) : 0);
	const step = $derived.by(() => {
		if (!planner.solverReady) {
			return 0;
		}

		if (!solve?.found) {
			return 1;
		}

		return solve.proven ? 3 : 2;
	});
	const steps = ['solve.loading', 'solve.searching', 'solve.checking', 'solve.trimming'] as const;
</script>

<div class="solving">
	<div class="bar" class:found={step >= 2} class:proven={step === 3}>
		<span></span>
	</div>
	<div class="row">
		<p>
			<!-- Only the step is announced: the time changes every second. -->
			<span class="step" role="status">{t(steps[step])}</span>
			<span class="time">{t('solve.elapsed', {seconds})}</span>
		</p>
		<!-- One button whose action changes, so it keeps focus when it does. -->
		<button
			class="btn small"
			{@attach solveControl}
			onclick={() => (solve?.found ? planner.stop() : planner.cancel())}
		>
			<Icon name={solve?.found ? 'check' : 'stop'} />
			{t(solve?.found ? 'solve.usePlan' : 'solve.cancel')}
		</button>
	</div>
	{#if step === 0}
		<p class="note">{t('solve.download')}</p>
	{/if}
</div>

<style>
	.solving {
		display: grid;
		gap: 12px;
	}

	.bar {
		height: 8px;
		border-radius: 4px;
		background: var(--border);
		overflow: hidden;
	}

	.bar span {
		display: block;
		width: 35%;
		height: 100%;
		border-radius: inherit;
		background: var(--accent);
		animation: slide 1.3s ease-in-out infinite;
	}

	.bar.found span {
		width: 70%;
	}

	.bar.proven span {
		width: 100%;
		background: var(--success);
		animation: none;
	}

	@keyframes slide {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(300%);
		}
	}

	.bar.found span {
		animation-name: slide-short;
	}

	@keyframes slide-short {
		from {
			transform: translateX(-60%);
		}
		to {
			transform: translateX(110%);
		}
	}

	/* Without motion the bar fills in steps as the solve moves on. */
	@media (prefers-reduced-motion: reduce) {
		.bar span,
		.bar.found span {
			animation: none;
		}
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	p {
		margin: 0;
	}

	.step {
		font-weight: 600;
	}

	.time {
		margin-inline-start: 8px;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	.note {
		color: var(--muted);
		font-size: 0.85rem;
	}
</style>
