<script lang="ts">
	import ColorFilter from '#lib/components/combinations/ColorFilter.svelte';
	import Combination from '#lib/components/combinations/Combination.svelte';
	import CombinationGrid from '#lib/components/combinations/CombinationGrid.svelte';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';

	const handlePreview = (uid: string) => {
		combinations.previewedUid =
			combinations.previewedUid === uid ? null : uid;
	};

	let colorCount = $derived(palette.colors.length);
</script>

{#if combinations.view === 'grid'}
	<CombinationGrid />
{:else}
	<div>
		{#if colorCount > 1}
			<div class="color-filter form">
				<ColorFilter />
			</div>
		{/if}

		<div class="list">
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
{/if}

<style>
	.color-filter {
		margin-bottom: var(--vgap);
	}

	.list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(22ch, 1fr));
		gap: 1rem;
		contain: layout;
	}
</style>
