<script lang="ts">
	import {formatSchemist} from '$lib/color/formatting';
	import Sample from '$lib/components/Sample.svelte';
	import ChildOption from '$lib/components/palette/ChildOption.svelte';
	import {defList as defs} from '$lib/definitions/nodes';
	import presets from '$lib/definitions/presets';
	import type {Preset} from '$lib/presets';
	import {presetSamples, sample, samples} from '$lib/samples';
	import type {Node} from '$lib/stores/nodes';
	import {
		continuousGradient,
		discreteGradient
	} from '$lib/utils/css';

	export let node: Node;
	export let onAddNode: (type: string) => void;
	export let onAddPreset: (preset: Preset) => void;

	const {output} = node;
	const color = $output[0];
</script>

<div class="picker">
	<section>
		<h2 class="h2">Color palettes</h2>

		<div class="grid">
			{#each presets as preset}
				<ChildOption
					label={preset.label}
					description={preset.description}
					onClick={() => {
						onAddPreset(preset);
					}}
				>
					<Sample
						color={discreteGradient(
							presetSamples(preset.nodes, color)
						)}
					/>
				</ChildOption>
			{/each}
		</div>
	</section>

	<section>
		<h2 class="h2">Single colors</h2>

		<div class="grid">
			{#each defs as def}
				<ChildOption
					label={def.label}
					description={def.description}
					onClick={() => {
						onAddNode(def.type);
					}}
				>
					<Sample
						color={def.samples === 'single'
							? formatSchemist(sample(def, color))
							: def.samples === 'continuous'
							? continuousGradient(
									samples(def, color, 10)
							  )
							: discreteGradient(samples(def, color, 10))}
					/>
				</ChildOption>
			{/each}
		</div>
	</section>
</div>

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: var(--vgap);
	}

	@media screen and (min-width: 45rem) {
		.picker {
			flex-direction: row;
			gap: var(--hgap);
		}
	}

	@media screen and (min-width: 80rem) {
		.picker {
			gap: calc(2 * var(--hgap));
		}
	}

	section {
		flex-basis: 50%;
		margin-bottom: 4rem;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem var(--hgap);
		place-items: end stretch;
	}

	@media screen and (min-width: 80rem) {
		.grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
