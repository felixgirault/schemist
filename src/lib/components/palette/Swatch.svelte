<script lang="ts">
	import {
		formatRgbToHex,
		formatSchemistToHex
	} from '#lib/color/formatting.js';
	import type {SchemistColor} from '#lib/color/types.js';
	import {palette} from '#lib/stores/palette.svelte.js';

	interface Props {
		id: string;
		// Given for a color the palette doesn't list (a hidden one).
		color?: SchemistColor;
	}

	let {id, color}: Props = $props();
	// none for a hidden color, unless given
	let hex = $derived.by(() => {
		if (color) return formatSchemistToHex(color);

		const found = palette.colors.find((c) => c.id === id);

		return found && formatRgbToHex(found.rgbColor);
	});
</script>

{#if hex}
	<span class="swatch" style="background: {hex};"></span>
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
