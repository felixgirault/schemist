<script>
	import Node from '#lib/components/palette/Node.svelte';
	import {getRootNode} from '#lib/palette.js';
	import {outputs, rootNode} from '#lib/stores/palette.js';
	import {onMount} from 'svelte';

	onMount(() => {
		$rootNode = getRootNode();
		$rootNode.connect(outputs);
	});
</script>

<div>
	{#if $rootNode}
		<Node node={$rootNode} />
	{/if}
</div>

<style>
	div {
		contain: layout;
	}
</style>
