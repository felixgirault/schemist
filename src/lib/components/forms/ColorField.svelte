<script lang="ts">
	import {randomUsableColor} from '$lib/color/manipulation';
	import type {SchemistColor} from '$lib/color/types';
	import CssColorField from '$lib/components/forms/CssColorField.svelte';
	import HslColorField from '$lib/components/forms/HslColorField.svelte';
	import LchColorField from '$lib/components/forms/LchColorField.svelte';
	import RgbColorField from '$lib/components/forms/RgbColorField.svelte';
	import type {Node, Param} from '$lib/stores/nodes';

	type InputFormat = 'css' | 'rgb' | 'hsl' | 'lch';

	export let id: Node['id'];
	export let param: Param;
	export let value: SchemistColor;

	let format: InputFormat = 'rgb';
</script>

<div class="input-grid-firstCol input-grid-lastCol">
	<fieldset>
		<legend>{param.label}</legend>

		<div class="fieldset-fields">
			<div class="input-grid">
				<p id="{id}-format" class="input-grid-firstCol">
					Format
				</p>

				<div
					class="button-list input-grid-lastCols"
					role="group"
					aria-labelledby="{id}-format"
				>
					<input
						id="{id}-rgb"
						class="button-trigger hidden"
						type="radio"
						value="rgb"
						bind:group={format}
					/>
					<label
						class="button button--inline"
						for="{id}-rgb"
					>
						RGB
					</label>

					<input
						id="{id}-hsl"
						class="button-trigger hidden"
						type="radio"
						value="hsl"
						bind:group={format}
					/>
					<label
						class="button button--inline"
						for="{id}-hsl"
					>
						HSL
					</label>

					<input
						id="{id}-lch"
						class="button-trigger hidden"
						type="radio"
						value="lch"
						bind:group={format}
					/>
					<label
						class="button button--inline"
						for="{id}-lch"
					>
						LCH
					</label>

					<input
						id="{id}-css"
						class="button-trigger hidden"
						type="radio"
						value="css"
						bind:group={format}
					/>
					<label
						class="button button--inline"
						for="{id}-css"
					>
						CSS
					</label>
				</div>

				<svelte:component
					this={format === 'css'
						? CssColorField
						: format === 'rgb'
						? RgbColorField
						: format === 'hsl'
						? HslColorField
						: LchColorField}
					{id}
					bind:value
				/>

				<button
					class="button button--inline input-grid-lastCols randomize"
					type="button"
					on:click={() => {
						value = randomUsableColor();
					}}
				>
					Randomize
				</button>
			</div>
		</div>
	</fieldset>
</div>

<style>
	.randomize {
		place-self: start;
	}
</style>
