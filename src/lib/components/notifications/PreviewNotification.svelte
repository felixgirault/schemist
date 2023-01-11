<script lang="ts">
	import {rgbToSchemist} from '$lib/color/conversion';
	import CloseIcon from '$lib/components/icons/CloseIcon.svelte';
	import type {Combination} from '$lib/stores/combinations';
	import {duoThemeStyle} from '$lib/style';

	export let combination: Combination;
	export let onClose: () => void;

	$: fg = rgbToSchemist(combination.contrast.fg);
	$: bg = rgbToSchemist(combination.contrast.bg);
	$: style =
		bg.l < fg.l
			? duoThemeStyle({...bg, l: 10}, {...fg, l: 95})
			: duoThemeStyle({...bg, l: 90}, {...fg, l: 10});
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
		on:click={onClose}
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
		animation: slide-up 250ms ease-out;
	}

	.button {
		flex-shrink: 0;
	}
</style>
