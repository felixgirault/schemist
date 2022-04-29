<script lang="ts">
	import BlindnessFilter from '$lib/components/combinations/BlindnessFilter.svelte';
	import ColorFilter from '$lib/components/combinations/ColorFilter.svelte';
	import Combination from '$lib/components/combinations/Combination.svelte';
	import ContrastFilter from '$lib/components/combinations/ContrastFilter.svelte';
	import ContrastTypeFilter from '$lib/components/combinations/ContrastTypeFilter.svelte';
	import LuminosityFilter from '$lib/components/combinations/LuminosityFilter.svelte';
	import {
		colorEntries,
		filteredCombinations,
		previewedCombinationUid
	} from '$lib/stores/combinations';

	const handlePreview = (uid: string) => {
		$previewedCombinationUid =
			$previewedCombinationUid === uid ? null : uid;
	};

	$: colorCount = $colorEntries?.length || 0;
</script>

<div class="data-layout">
	<div class="data-options-track">
		{#if colorCount > 1}
			<div class="data-options form">
				<ColorFilter />
				<ContrastTypeFilter />
				<ContrastFilter />
				<BlindnessFilter />
				<LuminosityFilter />
			</div>
		{/if}
	</div>

	<div class="list">
		<!-- Using a keyed each here worsens performances as it causes layout shifts -->
		{#each $filteredCombinations as { uid, bgName, fgName, contrast, simulatedContrasts }}
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
					There is no color combination matching the
					selected filters.
					<br />
					Try adding more colors to your palette or changing
					filters.
				</p>
			{:else}
				<p>
					Add colors to your palette to try color
					combinations.
				</p>
			{/if}
		{/each}
	</div>
</div>

<style>
	.data-options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(28ch, 1fr));
		gap: 1rem;
		animation: slide-up 250ms ease-out;
		contain: layout;
	}

	.list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(22ch, 1fr));
		gap: 1rem;
		contain: layout;
	}
</style>
