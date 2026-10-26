<script lang="ts">
	import {formatSchemist} from '#lib/color/formatting.js';
	import type {SchemistColor} from '#lib/color/types.js';
	import ChildOption from '#lib/components/palette/ChildOption.svelte';
	import Sample from '#lib/components/Sample.svelte';
	import {defList as defs} from '#lib/definitions/nodes/index.js';
	import presets from '#lib/definitions/presets/index.js';
	import type {NodeType} from '#lib/model/definitions.js';
	import {
		presetSamples,
		sample,
		samples
	} from '#lib/samples.js';
	import {
		continuousGradient,
		discreteGradient
	} from '#lib/utils/css.js';

	interface Props {
		// Color on which samples are computed.
		color: SchemistColor;
		selectedType?: NodeType;
		// Presets can't replace a type, see ADR 4.
		hasPresets?: boolean;
		onAddNode: (type: NodeType) => void;
	}

	let {color, selectedType, hasPresets, onAddNode}: Props =
		$props();
</script>

<div class="picker">
	{#if hasPresets}
		<section>
			<h2 class="h2">Color palettes</h2>

			<div class="grid">
				{#each presets as preset (preset.type)}
					<ChildOption
						label={preset.label}
						description={preset.description}
						onClick={() => {
							onAddNode(preset.type);
						}}
					>
						<Sample
							color={discreteGradient(
								presetSamples(
									[{type: preset.type}],
									color
								)
							)}
						/>
					</ChildOption>
				{/each}
			</div>
		</section>
	{/if}

	<section>
		<h2 class="h2">Single colors</h2>

		<div class="grid">
			{#each defs as def}
				<ChildOption
					label={def.label}
					description={def.description}
					isSelected={def.type === selectedType}
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
								: discreteGradient(
										samples(def, color, 10)
									)}
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
		flex-grow: 1;
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
