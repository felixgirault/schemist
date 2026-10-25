<script lang="ts">
	import BooleanField from '#lib/components/forms/BooleanField.svelte';
	import ColorField from '#lib/components/forms/ColorField.svelte';
	import RangeField from '#lib/components/forms/RangeField.svelte';
	import {paramSamples} from '#lib/samples.js';
	import type {Node} from '#lib/stores/nodes.svelte.js';
	import {isGroupDef} from '#lib/stores/nodes.svelte.js';
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
				gradient={isGroupDef(def)
					? // Groups output several colors, see ADR 4.
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
				bind:value={node.args[param.name]}
			/>
		{:else}
			{@const SvelteComponent =
				param.type === 'color' ? ColorField : BooleanField}
			<SvelteComponent
				id={nodeId}
				{param}
				bind:value={node.args[param.name]}
			/>
		{/if}
	{/each}
</form>
