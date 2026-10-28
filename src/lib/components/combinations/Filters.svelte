<script lang="ts">
	import BlindnessFilter from '#lib/components/combinations/BlindnessFilter.svelte';
	import ContrastFilter from '#lib/components/combinations/ContrastFilter.svelte';
	import ContrastTypeFilter from '#lib/components/combinations/ContrastTypeFilter.svelte';
	import LuminosityFilter from '#lib/components/combinations/LuminosityFilter.svelte';
	import ViewFilter from '#lib/components/combinations/ViewFilter.svelte';
</script>

<div class="filters">
	<ViewFilter />

	<div class="group">
		<ContrastTypeFilter />
		<ContrastFilter />
	</div>

	<div class="group">
		<BlindnessFilter />
		<LuminosityFilter />
	</div>
</div>

<style>
	.filters,
	.group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.filters {
		gap: 0.5rem 1rem;
		animation: var(--animation-slide-up);
	}

	.filters :global(fieldset) {
		margin: 0;
	}

	.filters :global(.fieldset-fields) {
		padding: 0;
	}
</style>
