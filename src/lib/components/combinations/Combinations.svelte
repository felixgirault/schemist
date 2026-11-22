<script lang="ts">
	import BlindnessFilter from '#lib/components/combinations/BlindnessFilter.svelte';
	import ColorFilter from '#lib/components/combinations/ColorFilter.svelte';
	import Combination from '#lib/components/combinations/Combination.svelte';
	import type {Row} from '#lib/components/combinations/Combination.svelte';
	import ContrastFilter from '#lib/components/combinations/ContrastFilter.svelte';
	import ContrastTypeFilter from '#lib/components/combinations/ContrastTypeFilter.svelte';
	import DifferenceFilter from '#lib/components/combinations/DifferenceFilter.svelte';
	import DifferenceMatrix from '#lib/components/combinations/DifferenceMatrix.svelte';
	import LuminosityFilter from '#lib/components/combinations/LuminosityFilter.svelte';
	import ModeFilter from '#lib/components/combinations/ModeFilter.svelte';
	import PairMatrix from '#lib/components/combinations/PairMatrix.svelte';
	import Result from '#lib/components/combinations/Result.svelte';
	import UseFilter from '#lib/components/combinations/UseFilter.svelte';
	import type {CombinationContrast} from '#lib/core/contrast.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';

	const handlePreview = (uid: string) => {
		combinations.previewedUid =
			combinations.previewedUid === uid ? null : uid;
	};

	const rowOf = ({
		level,
		grade
	}: CombinationContrast): Row[] => [
		{
			name: `${combinations.contrastType === 'wcag3' ? 'APCA ' : ''}${grade}`,
			level
		}
	];

	let colorCount = $derived(palette.colors?.length || 0);
</script>

<div class="data-layout">
	<div class="data-options-track">
		{#if colorCount > 1}
			<div class="data-options form">
				<ModeFilter />
				{#if combinations.mode !== 'result'}
					<ColorFilter />
				{/if}
				{#if combinations.mode === 'contrast'}
					<ContrastTypeFilter />
					<ContrastFilter />
				{:else if combinations.mode === 'difference'}
					<DifferenceFilter />
				{:else if combinations.mode === 'pairs'}
					<UseFilter />
				{/if}
				<BlindnessFilter />
				<LuminosityFilter />
			</div>
		{/if}
	</div>

	{#if combinations.mode === 'pairs'}
		<PairMatrix />
	{:else if combinations.mode === 'result'}
		<Result />
	{:else if combinations.mode === 'difference'}
		<DifferenceMatrix />
	{:else}
		<div class="list">
			<!-- Using a keyed each here worsens performances as it causes layout shifts -->
			{#each combinations.filtered as { uid, bgName, fgName, contrast, simulatedContrasts }}
				<Combination
					{uid}
					{bgName}
					{fgName}
					bg={contrast.bg}
					fg={contrast.fg}
					rows={rowOf(contrast)}
					simulations={simulatedContrasts.map((s) => ({
						...s,
						rows: rowOf(s)
					}))}
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
	{/if}
</div>

<style>
	.data-options {
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
