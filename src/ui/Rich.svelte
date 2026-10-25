<!-- SPDX-FileCopyrightText: 2026 SerLizar -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<!-- A translated message with bold runs, from `rich()`; never raw HTML. -->
<script lang="ts">
	import type {Part} from '../i18n/format.ts';

	let {parts}: {parts: readonly Part[]} = $props();
</script>

{#each parts as part, i (i)}{#if part.bold}<strong>{part.text}</strong>{:else}{part.text}{/if}{/each}
