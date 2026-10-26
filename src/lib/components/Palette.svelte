<script>
	import Node from '#lib/components/palette/Node.svelte';
	import {getRootNode} from '#lib/palette.js';
	import {startHistory} from '#lib/stores/history.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import {onMount} from 'svelte';

	onMount(() => {
		palette.root = getRootNode();
		startHistory();
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
