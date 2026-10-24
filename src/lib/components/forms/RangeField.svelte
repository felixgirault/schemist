<script lang="ts">
	import RangeInput from '#lib/components/forms/RangeInput.svelte';
	import type {ComponentProps} from 'svelte';

	interface Props {
		id: string;
		label: string;
		min?: number;
		max?: number;
		gradient: string;
		value: number;
		unit?: string;
		onInput?: ComponentProps<typeof RangeInput>['onInput'];
	}

	let {
		id,
		label,
		min = 0,
		max = 100,
		gradient,
		value = $bindable(),
		unit = '',
		onInput = undefined
	}: Props = $props();
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
