<script lang="ts">
	import Combination from '#lib/components/combinations/Combination.svelte';
	import {combinations} from '#lib/stores/combinations.svelte.js';

	const handlePreview = (uid: string) => {
		combinations.previewedUid =
			combinations.previewedUid === uid ? null : uid;
	};

	let colorCount = $derived(
		combinations.colorEntries?.length || 0
	);
</script>

<div class="combinations">
	<!-- Using a keyed each here worsens performances as it causes layout shifts -->
	{#each combinations.filtered as { uid, bgName, fgName, contrast, simulatedContrasts }}
		<Combination
			{uid}
			{bgName}
			{fgName}
			{contrast}
			{simulatedContrasts}
			onPreview={handlePreview}
		/>
	{:else}
		{#if colorCount > 1}
			<p>
				There is no color combination matching the selected
				filters.
				<br />
				Try adding more colors to your palette or changing filters.
			</p>
		{:else}
			<p>
				Add colors to your palette to try color combinations.
			</p>
		{/if}
	{/each}
</div>

<style>
	.combinations {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(22ch, 1fr));
		gap: 1rem;
		contain: layout;
	}
</style>
