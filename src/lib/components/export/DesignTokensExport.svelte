<script lang="ts">
	import type {PaletteColor} from '#lib/core/evaluate.js';
	import type {Requirements} from '#lib/core/export.js';
	import {exportTokens} from '#lib/core/export.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import CodeArea from './CodeArea.svelte';

	interface Props {
		entries: PaletteColor[];
		requirements: Requirements;
	}

	let {entries, requirements}: Props = $props();

	let exported = $derived(
		exportTokens(entries, palette.permalink, requirements)
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
	/* Stretches like the code area alone would in the export grid. */
	div {
		display: flex;
		flex-direction: column;
		align-self: stretch;
	}
</style>
