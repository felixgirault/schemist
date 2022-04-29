<svelte:options immutable />

<script lang="ts" context="module">
	import type {Entry} from '$lib/stores/combinations';

	export type Format = 'table' | 'css' | 'sass';
	export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'lch';
	export type Casing = 'dash' | 'camel';
	export interface ExportEntry extends Entry {
		cssColor: string;
	}
</script>

<script lang="ts">
	import {
		cssColor,
		hexColor,
		hslColor,
		lchColor,
		rgbColor
	} from '$lib/color/spaces';
	import TableExport from '$lib/components/export/TableExport.svelte';
	import VariablesExport from '$lib/components/export/VariablesExport.svelte';
	import {colorEntries} from '$lib/stores/combinations';

	let format: Format = 'table';
	let colorFormat: ColorFormat = 'hex';
	let casing: Casing = 'dash';
	let precision = 3;

	$: entries = $colorEntries.map(({color, ...entry}) => ({
		...entry,
		color,
		cssColor:
			colorFormat === 'rgb'
				? cssColor(rgbColor(color), precision)
				: colorFormat === 'hsl'
				? cssColor(hslColor(color), precision)
				: colorFormat === 'lch'
				? cssColor(lchColor(color), precision)
				: hexColor(color)
	}));
</script>

<section>
	<h2 class="h2">Color values</h2>

	<div class="data-layout">
		<div class="data-options-track">
			<div class="data-options form">
				<fieldset>
					<legend>Format</legend>

					<div class="fieldset-fields">
						<div class="button-list">
							<input
								class="button-trigger hidden"
								id="format-table"
								type="radio"
								value="table"
								bind:group={format}
							/>
							<label class="button" for="format-table">
								Table
							</label>

							<input
								class="button-trigger hidden"
								id="format-css"
								type="radio"
								value="css"
								bind:group={format}
							/>
							<label class="button" for="format-css">
								CSS
							</label>

							<input
								class="button-trigger hidden"
								id="format-sass"
								type="radio"
								value="sass"
								bind:group={format}
							/>
							<label class="button" for="format-sass">
								Sass
							</label>
						</div>
					</div>
				</fieldset>

				<fieldset>
					<legend>Color format</legend>

					<div class="fieldset-fields">
						<div class="button-list">
							<input
								class="button-trigger hidden"
								id="colorFormat-hex"
								type="radio"
								value="hex"
								bind:group={colorFormat}
							/>
							<label class="button" for="colorFormat-hex">
								Hex
							</label>

							<input
								class="button-trigger hidden"
								id="colorFormat-rgb"
								type="radio"
								value="rgb"
								bind:group={colorFormat}
							/>
							<label class="button" for="colorFormat-rgb">
								RGB
							</label>

							<input
								class="button-trigger hidden"
								id="colorFormat-hsl"
								type="radio"
								value="hsl"
								bind:group={colorFormat}
							/>
							<label class="button" for="colorFormat-hsl">
								HSL
							</label>

							<input
								class="button-trigger hidden"
								id="colorFormat-lch"
								type="radio"
								value="lch"
								bind:group={colorFormat}
							/>
							<label class="button" for="colorFormat-lch">
								LCH
							</label>
						</div>
					</div>
				</fieldset>

				{#if format !== 'table'}
					<fieldset>
						<legend>Variables casing</legend>

						<div class="fieldset-fields">
							<div class="button-list">
								<input
									class="button-trigger hidden"
									id="casing-dash"
									type="radio"
									value="dash"
									bind:group={casing}
								/>
								<label class="button" for="casing-dash">
									dash-case
								</label>

								<input
									class="button-trigger hidden"
									id="casing-camel"
									type="radio"
									value="camel"
									bind:group={casing}
								/>
								<label class="button" for="casing-camel">
									camelCase
								</label>
							</div>
						</div>
					</fieldset>
				{/if}

				{#if colorFormat !== 'hex' && colorFormat !== 'rgb'}
					<label for="precision">Precision</label>
					<input
						id="precision"
						name="precision"
						type="number"
						min={0}
						max={5}
						bind:value={precision}
					/>
				{/if}
			</div>
		</div>

		{#if format === 'table'}
			<TableExport {entries} />
		{:else}
			<VariablesExport {entries} {format} {casing} />
		{/if}
	</div>
</section>
