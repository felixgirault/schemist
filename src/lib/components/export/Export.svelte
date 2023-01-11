<svelte:options immutable />

<script lang="ts">
	import {formatSchemistTo} from '$lib/color/formatting';
	import TableExport from '$lib/components/export/TableExport.svelte';
	import VariablesExport from '$lib/components/export/VariablesExport.svelte';
	import {colorEntries} from '$lib/stores/combinations';
	import {
		exportCasing,
		exportColorFormat,
		exportFormat,
		exportPrecision
	} from '$lib/stores/export';
	import DesignTokensExport from './DesignTokensExport.svelte';

	$: entries = $colorEntries.map(({color, ...entry}) => ({
		...entry,
		color,
		cssColor: formatSchemistTo(
			color,
			$exportColorFormat,
			$exportPrecision
		)
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
								bind:group={$exportFormat}
							/>
							<label class="button" for="format-table">
								Table
							</label>

							<input
								class="button-trigger hidden"
								id="format-tokens"
								type="radio"
								value="tokens"
								bind:group={$exportFormat}
							/>
							<label class="button" for="format-tokens">
								Design tokens
							</label>

							<input
								class="button-trigger hidden"
								id="format-css"
								type="radio"
								value="css"
								bind:group={$exportFormat}
							/>
							<label class="button" for="format-css">
								CSS
							</label>

							<input
								class="button-trigger hidden"
								id="format-sass"
								type="radio"
								value="sass"
								bind:group={$exportFormat}
							/>
							<label class="button" for="format-sass">
								Sass
							</label>
						</div>
					</div>
				</fieldset>

				{#if $exportFormat !== 'tokens'}
					<fieldset>
						<legend>Color format</legend>

						<div class="fieldset-fields">
							<div class="button-list">
								<input
									class="button-trigger hidden"
									id="colorFormat-hex"
									type="radio"
									value="hex"
									bind:group={$exportColorFormat}
								/>
								<label
									class="button"
									for="colorFormat-hex"
								>
									Hex
								</label>

								<input
									class="button-trigger hidden"
									id="colorFormat-rgb"
									type="radio"
									value="rgb"
									bind:group={$exportColorFormat}
								/>
								<label
									class="button"
									for="colorFormat-rgb"
								>
									RGB
								</label>

								<input
									class="button-trigger hidden"
									id="colorFormat-hsl"
									type="radio"
									value="hsl"
									bind:group={$exportColorFormat}
								/>
								<label
									class="button"
									for="colorFormat-hsl"
								>
									HSL
								</label>

								<input
									class="button-trigger hidden"
									id="colorFormat-lch"
									type="radio"
									value="lch"
									bind:group={$exportColorFormat}
								/>
								<label
									class="button"
									for="colorFormat-lch"
								>
									LCH
								</label>
							</div>
						</div>
					</fieldset>
				{/if}

				{#if $exportFormat !== 'table' && $exportFormat !== 'tokens'}
					<fieldset>
						<legend>Variables casing</legend>

						<div class="fieldset-fields">
							<div class="button-list">
								<input
									class="button-trigger hidden"
									id="casing-dash"
									type="radio"
									value="dash"
									bind:group={$exportCasing}
								/>
								<label class="button" for="casing-dash">
									dash-case
								</label>

								<input
									class="button-trigger hidden"
									id="casing-camel"
									type="radio"
									value="camel"
									bind:group={$exportCasing}
								/>
								<label class="button" for="casing-camel">
									camelCase
								</label>
							</div>
						</div>
					</fieldset>
				{/if}

				{#if $exportColorFormat !== 'hex' && $exportColorFormat !== 'rgb'}
					<label for="precision">Precision</label>
					<input
						id="precision"
						name="precision"
						type="number"
						min={0}
						max={5}
						bind:value={$exportPrecision}
					/>
				{/if}
			</div>
		</div>

		{#if $exportFormat === 'table'}
			<TableExport {entries} />
		{:else if $exportFormat === 'tokens'}
			<DesignTokensExport entries={$colorEntries} />
		{:else}
			<VariablesExport
				{entries}
				format={$exportFormat}
				casing={$exportCasing}
			/>
		{/if}
	</div>
</section>
