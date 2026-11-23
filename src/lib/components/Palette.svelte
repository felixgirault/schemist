<script>
	import Node from '#lib/components/palette/Node.svelte';
	import {loadPalette} from '#lib/palette.js';
	import {startHistory} from '#lib/stores/history.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import {onMount} from 'svelte';

	onMount(() => {
		const {root, pairs, roles, rules, variants} =
			loadPalette();

		palette.root = root;
		palette.storedPairs = pairs;
		palette.storedRoles = roles;
		palette.rules = rules;
		palette.variants = variants;
		return startHistory(palette.root);
	});
</script>

<div>
	{#if palette.root}
		<Node node={palette.root} />
	{/if}
</div>

<style>
	div {
		contain: layout;
	}
</style>
