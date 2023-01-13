<script lang="ts">
	import RangeInput from '$lib/components/forms/RangeInput.svelte';

	export let id: string;
	export let label: string;
	export let min = 0;
	export let max = 100;
	export let gradient: string;
	export let value: number;
	export let unit = '';
	export let onInput: RangeInput['$$prop_def']['onInput'] =
		undefined;
</script>

<label class="input-grid-firstCol" for={id}>
	{label}
</label>

<RangeInput {id} {min} {max} {gradient} {onInput} bind:value />

<span class="value">
	{Math.round(value)}{unit}
</span>

<style>
	.value {
		min-width: 4ch;
		text-align: right;
	}
</style>
