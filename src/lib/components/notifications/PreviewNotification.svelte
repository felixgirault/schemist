<script lang="ts">
	import {rgbToSchemist} from '#lib/color/conversion.js';
	import CloseIcon from '#lib/components/icons/close.svg?component';
	import type {Combination} from '#lib/stores/combinations.svelte.js';
	import {duoThemeStyle} from '#lib/style.js';

	interface Props {
		combination: Combination;
		onClose: () => void;
	}

	let {combination, onClose}: Props = $props();

	let fg = $derived(rgbToSchemist(combination.contrast.fg));
	let bg = $derived(rgbToSchemist(combination.contrast.bg));
	let style = $derived(
		bg.l < fg.l
			? duoThemeStyle({...bg, l: 10}, {...fg, l: 95})
			: duoThemeStyle({...bg, l: 90}, {...fg, l: 10})
	);
</script>

<p class="elevated" {style}>
	<span>
		Previewing <em>{combination.fgName}</em>
		on
		<em>{combination.bgName}</em>
	</span>

	<button
		class="button button--icon"
		title="Stop"
		onclick={onClose}
	>
		<CloseIcon />
	</button>
</p>

<style>
	p {
		display: flex;
		align-items: center;
		gap: 1ch;
		border-radius: var(--radius);
		padding: 1rem;
		background: var(--fg);
		color: var(--bg);
		animation: var(--animation-slide-up);
	}

	.button {
		flex-shrink: 0;
	}
</style>
