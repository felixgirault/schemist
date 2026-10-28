<script lang="ts">
	import BlindnessFilter from '#lib/components/combinations/BlindnessFilter.svelte';
	import ContrastFilter from '#lib/components/combinations/ContrastFilter.svelte';
	import ContrastTypeFilter from '#lib/components/combinations/ContrastTypeFilter.svelte';
	import LuminosityFilter from '#lib/components/combinations/LuminosityFilter.svelte';
	import ViewFilter from '#lib/components/combinations/ViewFilter.svelte';
</script>

<div class="filters form">
	<ViewFilter />
	<ContrastTypeFilter />
	<ContrastFilter />
	<BlindnessFilter />
	<LuminosityFilter />
</div>

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 1rem 2rem;
		margin-bottom: var(--vgap);
		animation: var(--animation-slide-up);
		contain: layout;
	}

	.filters :global(.fieldset-fields) {
		padding: 0;
	}
</style>
