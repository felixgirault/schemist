<script lang="ts">
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import {palette} from '#lib/stores/palette.svelte.js';

	interface Props {
		id: string;
	}

	let {id}: Props = $props();
	// none for a hidden color
	let color = $derived(
		palette.colors.find((color) => color.id === id)
	);
</script>

{#if color}
	<span
		class="swatch"
		style="background: {formatRgbToHex(color.rgbColor)};"
	></span>
{/if}

<style>
	.swatch {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border: 1px solid currentColor;
		border-radius: 50%;
		vertical-align: middle;
	}
</style>
