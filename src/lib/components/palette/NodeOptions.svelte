<script lang="ts">
	import BooleanField from '#lib/components/forms/BooleanField.svelte';
	import ColorField from '#lib/components/forms/ColorField.svelte';
	import RangeField from '#lib/components/forms/RangeField.svelte';
	import {argOf, isPresetDef} from '#lib/core/nodes.js';
	import {paramSamples} from '#lib/samples.js';
	import type {Node} from '#lib/stores/nodes.svelte.js';
	import {view} from '#lib/stores/nodes.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
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
	const baseName = $derived(palette.variants[0]?.name);
</script>

<form
	{id}
	popover
	class="form input-grid"
	onsubmit={(event) => event.preventDefault()}
>
	{#each def.params as param (param.name)}
		<!-- A variant can't change what a preset generates. -->
		{@const isLocked = !!view.variant && !!param.isStructural}
		<fieldset class="param" disabled={isLocked}>
			{#if param.type === 'range'}
				<RangeField
					id={`${nodeId}-${param.name}`}
					label={param.label}
					unit={param.unit}
					min={param.min}
					max={param.max}
					gradient={isPresetDef(def)
						? // Presets output several colors, see ADR 7.
							'transparent'
						: (def.samples === 'continuous'
								? continuousGradient
								: discreteGradient)(
								paramSamples(
									def,
									node.activeArgs,
									param.name,
									node.input.color,
									clamp(param.max - param.min, 15)
								)
							)}
					bind:value={
						() => argOf(node.activeArgs, param),
						(value) => node.setArg(param.name, value)
					}
				/>
			{:else if param.type === 'color'}
				<ColorField
					id={nodeId}
					{param}
					bind:value={
						() => argOf(node.activeArgs, param),
						(value) => node.setArg(param.name, value)
					}
				/>
			{:else}
				<BooleanField
					id={nodeId}
					{param}
					bind:value={
						() => argOf(node.activeArgs, param),
						(value) => node.setArg(param.name, value)
					}
				/>
			{/if}
		</fieldset>

		{#if isLocked}
			<p class="hint input-grid-firstCol input-grid-lastCol">
				{param.label} is the same in every variant: change it in
				{baseName}.
			</p>
		{:else if node.isOverridden(param.name)}
			<button
				class="button button--inline input-grid-lastCols reset"
				type="button"
				onclick={() => node.resetArg(param.name)}
			>
				Reset to {baseName}
				<span class="hidden">
					({param.label})
				</span>
			</button>
		{/if}
	{/each}
</form>

<style>
	/* The fields lay out in the form's grid. */
	.param {
		display: contents;
	}

	.reset {
		place-self: start;
	}
</style>
