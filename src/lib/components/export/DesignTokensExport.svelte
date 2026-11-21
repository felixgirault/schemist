<script lang="ts">
	import type {Entry} from '#lib/core/evaluate.js';
	import {exportTokens} from '#lib/core/export.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import CodeArea from './CodeArea.svelte';

	interface Props {
		entries: Entry[];
	}

	let {entries}: Props = $props();

	let exported = $derived(
		exportTokens(entries, palette.permalink)
	);

	let conflictNotice = $derived(
		`Some names were exported flat or renamed to avoid conflicts: ${exported.conflicts.map((name) => `"${name}"`).join(', ')}.`
	);
</script>

<div>
	{#if exported.conflicts.length}
		<p class="hint" id="tokens-conflicts">
			{conflictNotice}
		</p>
	{/if}

	<CodeArea
		code={exported.json}
		describedby={exported.conflicts.length
			? 'tokens-conflicts'
			: undefined}
	/>
</div>

<style>
	div {
		display: flex;
		flex-direction: column;
	}
</style>
