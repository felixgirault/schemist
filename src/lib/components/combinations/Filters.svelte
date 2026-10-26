<script lang="ts">
	import BlindnessFilter from '#lib/components/combinations/BlindnessFilter.svelte';
	import ContrastFilter from '#lib/components/combinations/ContrastFilter.svelte';
	import ContrastTypeFilter from '#lib/components/combinations/ContrastTypeFilter.svelte';
	import GridFilter from '#lib/components/combinations/GridFilter.svelte';
	import LuminosityFilter from '#lib/components/combinations/LuminosityFilter.svelte';
</script>

<div class="data-options form">
	<ContrastTypeFilter />
	<ContrastFilter />
	<GridFilter />
	<BlindnessFilter />
	<LuminosityFilter />
</div>
