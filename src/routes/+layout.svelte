<script lang="ts">
	import Layout from '#lib/components/Layout.svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let {children}: Props = $props();
</script>

<Layout>
	{@render children?.()}
</Layout>
