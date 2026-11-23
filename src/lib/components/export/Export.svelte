<script lang="ts">
	import TableExport from '#lib/components/export/TableExport.svelte';
	import VariablesExport from '#lib/components/export/VariablesExport.svelte';
	import {toExportEntries} from '#lib/core/export.js';
	import {exportSettings} from '#lib/stores/export.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import DesignTokensExport from './DesignTokensExport.svelte';

	const requirements = $derived({
		pairs: palette.expandedPairs,
		roles: palette.roles
	});
	const entries = $derived(
		toExportEntries(
			palette.colors,
			exportSettings.colorFormat,
			exportSettings.precision
		)
	);
	// With variants (ADR 19): each one's entries, the base first.
	const variants = $derived(
		palette.variantColors.map(({name, colors}) => ({
			name,
			entries: toExportEntries(
				colors,
				exportSettings.colorFormat,
				exportSettings.precision
			)
		}))
	);
	// Tokens and Sass are one file per variant: the selected one.
	const isFile = $derived(
		exportSettings.format === 'tokens' ||
			exportSettings.format === 'sass'
	);
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
								bind:group={exportSettings.format}
							/>
							<label class="button" for="format-table">
								Table
							</label>

							<input
								class="button-trigger hidden"
								id="format-tokens"
								type="radio"
								value="tokens"
								bind:group={exportSettings.format}
							/>
							<label class="button" for="format-tokens">
								Design tokens
							</label>

							<input
								class="button-trigger hidden"
								id="format-css"
								type="radio"
								value="css"
								bind:group={exportSettings.format}
							/>
							<label class="button" for="format-css">
								CSS
							</label>

							<input
								class="button-trigger hidden"
								id="format-sass"
								type="radio"
								value="sass"
								bind:group={exportSettings.format}
							/>
							<label class="button" for="format-sass">
								Sass
							</label>
						</div>
					</div>
				</fieldset>

				{#if exportSettings.format !== 'tokens'}
					<fieldset>
						<legend>Color format</legend>

						<div class="fieldset-fields">
							<div class="button-list">
								<input
									class="button-trigger hidden"
									id="colorFormat-hex"
									type="radio"
									value="hex"
									bind:group={
										exportSettings.colorFormat
									}
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
									bind:group={
										exportSettings.colorFormat
									}
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
									bind:group={
										exportSettings.colorFormat
									}
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
									bind:group={
										exportSettings.colorFormat
									}
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

				{#if exportSettings.format !== 'table' && exportSettings.format !== 'tokens'}
					<fieldset>
						<legend>Variables casing</legend>

						<div class="fieldset-fields">
							<div class="button-list">
								<input
									class="button-trigger hidden"
									id="casing-dash"
									type="radio"
									value="dash"
									bind:group={exportSettings.casing}
								/>
								<label class="button" for="casing-dash">
									dash-case
								</label>

								<input
									class="button-trigger hidden"
									id="casing-camel"
									type="radio"
									value="camel"
									bind:group={exportSettings.casing}
								/>
								<label class="button" for="casing-camel">
									camelCase
								</label>
							</div>
						</div>
					</fieldset>

					<div>
						<label for="prefix">Variables prefix</label>
						<input
							id="prefix"
							name="prefix"
							type="text"
							bind:value={exportSettings.prefix}
						/>
					</div>
				{/if}

				{#if exportSettings.format !== 'tokens' && exportSettings.colorFormat !== 'hex' && exportSettings.colorFormat !== 'rgb'}
					<div>
						<label for="precision">Precision</label>
						<input
							id="precision"
							name="precision"
							type="number"
							min={0}
							max={5}
							bind:value={exportSettings.precision}
						/>
					</div>
				{/if}

				{#if palette.selectedVariant && isFile}
					<p class="hint" id="export-variant">
						Exporting the {palette.selectedVariant.name}
						variant. Select another in the palette to export
						it.
					</p>
				{/if}
			</div>
		</div>

		{#if exportSettings.format === 'table'}
			<TableExport
				variants={variants.length
					? variants
					: [{name: '', entries}]}
				{requirements}
			/>
		{:else if exportSettings.format === 'tokens'}
			<DesignTokensExport
				entries={palette.colors}
				{requirements}
			/>
		{:else}
			<VariablesExport
				entries={exportSettings.format === 'css'
					? (variants[0]?.entries ?? entries)
					: entries}
				others={variants.slice(1)}
				format={exportSettings.format}
				casing={exportSettings.casing}
				prefix={exportSettings.prefix}
				{requirements}
			/>
		{/if}
	</div>
</section>
