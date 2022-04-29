<script>
	import {getRootNode} from '$lib/palette';
	import {outputs, rootNode} from '$lib/stores/palette';
	import {onMount} from 'svelte';
	import Node from '$lib/components/palette/Node.svelte';

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
