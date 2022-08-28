<script>
	import BlindnessFilter from './BlindnessFilter.svelte';
	import ContrastFilter from './ContrastFilter.svelte';
	import ContrastTypeFilter from './ContrastTypeFilter.svelte';
	import GridFilter from './GridFilter.svelte';
	import LuminosityFilter from './LuminosityFilter.svelte';
</script>

<div class="data-options form">
	<ContrastTypeFilter />
	<ContrastFilter />
	<GridFilter />
	<BlindnessFilter />
	<LuminosityFilter />
</div>
