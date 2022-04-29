<script lang="ts">
	import BooleanField from '$lib/components/forms/BooleanField.svelte';
	import ColorField from '$lib/components/forms/ColorField.svelte';
	import RangeField from '$lib/components/forms/RangeField.svelte';
	import {paramSamples} from '$lib/samples';
	import type {Node} from '$lib/stores/nodes';
	import {
		continuousGradient,
		discreteGradient
	} from '$lib/utils/css';
	import {clamp} from '$lib/utils/math';

	export let id: string;
	export let node: Node;

	const {id: nodeId, def, args, input} = node;
</script>

<form {id} class="form input-grid" on:submit|preventDefault>
	{#each def.params as param (param.name)}
		{#if param.type === 'range'}
			<RangeField
				id={`${nodeId}-${param.name}`}
				label={param.label}
				unit={param.unit}
				min={param.min}
				max={param.max}
				gradient={(def.samples === 'continuous'
					? continuousGradient
					: discreteGradient)(
					paramSamples(
						def,
						$args,
						param.name,
						$input[0],
						clamp(param.max - param.min, 15)
					)
				)}
				bind:value={$args[param.name]}
			/>
		{:else}
			<svelte:component
				this={param.type === 'color'
					? ColorField
					: BooleanField}
				id={nodeId}
				{param}
				bind:value={$args[param.name]}
			/>
		{/if}
	{/each}
</form>

<style>
	form {
		margin-top: 0.5rem;
	}
</style>
