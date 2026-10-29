<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<!--
  An on/off option: a switch, its title and what it does. Spacing around it
  belongs to where it is placed: set `--switch-margin` to change it.
-->
<script lang="ts">
	import type {Snippet} from 'svelte';

	interface Props {
		checked: boolean;
		disabled?: boolean;
		/**
		The switch's name, in words or with a guild's mark.
		*/
		title: string | Snippet;
		/**
		What turning it on does, read after the name.
		*/
		description?: string;
		onchange(isOn: boolean): void;
	}
	let {
		checked, disabled = false, title, description, onchange,
	}: Props = $props();
	const id = $props.id();
</script>

<label class="option">
	<input
		type="checkbox"
		role="switch"
		{checked}
		{disabled}
		aria-labelledby="{id}-title"
		aria-describedby={description === undefined ? undefined : `${id}-desc`}
		onchange={event => onchange(event.currentTarget.checked)}
	/>
	<span class="title" id="{id}-title">
		{#if typeof title === 'string'}{title}{:else}{@render title()}{/if}
	</span>
	{#if description !== undefined}
		<span class="desc" id="{id}-desc">{description}</span>
	{/if}
</label>

<style>
	.option {
		display: grid;
		position: relative;
		margin: var(--switch-margin, -4px 0 16px);
		padding-block: 4px;
		padding-inline: 64px 0;
		color: var(--text);
		font-size: 1rem;
		cursor: pointer;
	}

	.option input {
		position: absolute;
		inset-inline-start: 4px;
		top: 4px;
		width: 44px;
		height: 24px;
		margin: 0;
		/* Off: an outlined track and a muted knob, both clear of the card (WCAG 1.4.11). */
		border: 2px solid var(--muted);
		border-radius: 999px;
		background: var(--surface);
		appearance: none;
		-webkit-appearance: none;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.option input::after {
		content: '';
		position: absolute;
		top: 2px;
		inset-inline-start: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--muted);
		transition:
			inset-inline-start 0.15s,
			background 0.15s;
	}

	.option input:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.option:has(input:disabled) {
		cursor: not-allowed;
	}

	.option input:checked {
		border-color: var(--accent);
		background: var(--accent);
	}

	.option input:checked::after {
		background: var(--surface);
		/* Towards the end of the line, whichever way the language writes. */
		inset-inline-start: 22px;
	}

	/* Forced colours drop backgrounds: draw the switch in system colours. */
	@media (forced-colors: active) {
		.option input {
			forced-color-adjust: none;
			border-color: CanvasText;
			background: Canvas;
		}

		.option input::after {
			background: CanvasText;
		}

		.option input:checked {
			border-color: Highlight;
			background: Highlight;
		}

		.option input:checked::after {
			background: HighlightText;
		}
	}

	.title {
		font-weight: 700;
	}

	.desc {
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
