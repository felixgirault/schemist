<script lang="ts">
	import WarningIcon from '#lib/components/icons/WarningIcon.svelte';
	import {palette} from '#lib/stores/palette.svelte.js';

	interface Props {
		// A color of the palette: a node's or a generated one's.
		id: string;
		name: string;
	}

	let {id, name}: Props = $props();

	const given = $derived(
		palette.roles.filter(({colors}) => colors.includes(id))
	);
	// Its roles are lost on reload, as another color has its name.
	const isUnsaved = $derived(
		given.length > 0 && palette.unsavedMembers.includes(name)
	);
	const warning =
		"Another color has this name: its roles won't be saved until one of the colors is renamed.";
</script>

{#if given.length}
	<span class="given">
		· {given.map(({name}) => name).join(', ')}
	</span>
{/if}

{#if isUnsaved}
	<span class="warning" title={warning}>
		<WarningIcon />
		<span class="hidden">{warning}</span>
	</span>
{/if}

<style>
	/* Positioned, to hold the visually hidden text */
	.warning {
		position: relative;
	}

	.warning :global(svg) {
		width: 1em;
		height: 1em;
		vertical-align: -0.125em;
	}
</style>
