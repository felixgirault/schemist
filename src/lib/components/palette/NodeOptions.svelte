<script lang="ts">
	import BooleanField from '#lib/components/forms/BooleanField.svelte';
	import ColorField from '#lib/components/forms/ColorField.svelte';
	import RangeField from '#lib/components/forms/RangeField.svelte';
	import {argOf, isPresetDef} from '#lib/model/definitions.js';
	import {paramSamples} from '#lib/samples.js';
	import type {Node} from '#lib/stores/nodes.svelte.js';
	import {
		continuousGradient,
		discreteGradient
	} from '#lib/utils/css.js';
	import {clamp} from '#lib/utils/math.js';

	interface Props {
		id: string;
		node: Node;
	}

	let {id, node}: Props = $props();

	const {id: nodeId, def} = $derived(node);
</script>

<form
	{id}
	popover
	class="form input-grid"
	onsubmit={(event) => event.preventDefault()}
>
	{#each def.params as param (param.name)}
		{#if param.type === 'range'}
			<RangeField
				id={`${nodeId}-${param.name}`}
				label={param.label}
				unit={param.unit}
				min={param.min}
				max={param.max}
				gradient={isPresetDef(def)
					? // Presets output several colors, see ADR 4.
						'transparent'
					: (def.samples === 'continuous'
							? continuousGradient
							: discreteGradient)(
							paramSamples(
								def,
								node.args,
								param.name,
								node.input[0],
								clamp(param.max - param.min, 15)
							)
						)}
				bind:value={
					() => argOf(node.args, param),
					(value) => (node.args[param.name] = value)
				}
			/>
		{:else if param.type === 'color'}
			<ColorField
				id={nodeId}
				{param}
				bind:value={
					() => argOf(node.args, param),
					(value) => (node.args[param.name] = value)
				}
			/>
		{:else}
			<BooleanField
				id={nodeId}
				{param}
				bind:value={
					() => argOf(node.args, param),
					(value) => (node.args[param.name] = value)
				}
			/>
		{/if}
	{/each}
</form>
