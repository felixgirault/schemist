<script lang="ts">
	import Layout from '$lib/components/Layout.svelte';

	export const prerender = true;
	export const csr = false;
</script>

<Layout>
	<slot />
</Layout>
