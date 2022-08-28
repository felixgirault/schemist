<script lang="ts">
	import {
		wcag2Contrast,
		wcag3Contrast
	} from '$lib/color/contrast';
	import {cssColor, hexColor} from '$lib/color/spaces';
	import {
		colorEntries,
		contrastType,
		minLevel,
		selectedCombinations
	} from '$lib/stores/combinations';

	$: levelFn =
		$contrastType === 'wcag2' ? wcag2Contrast : wcag3Contrast;

	const selectAll = () => {
		const areAllSelected = $colorEntries.every(({id: bgId}) =>
			$colorEntries.every(
				({id: fgId}) =>
					bgId === fgId ||
					$selectedCombinations?.[bgId]?.[fgId]
			)
		);

		$selectedCombinations = Object.fromEntries(
			$colorEntries.map(({id: bgId}) => [
				bgId,
				Object.fromEntries(
					$colorEntries.map(({id: fgId}) => [
						fgId,
						bgId === fgId ? false : !areAllSelected
					])
				)
			])
		);
	};

	const selectBackgrounds = (bgId) => {
		const areAllSelected = $colorEntries.every(
			({id}) =>
				id === bgId || $selectedCombinations?.[bgId]?.[id]
		);

		$selectedCombinations[bgId] = Object.fromEntries(
			$colorEntries.map(({id}) => [
				id,
				id === bgId ? false : !areAllSelected
			])
		);
	};

	const selectForegrounds = (fgId) => {
		const areAllSelected = $colorEntries.every(
			({id}) =>
				id === fgId || $selectedCombinations?.[id]?.[fgId]
		);

		$selectedCombinations = Object.fromEntries(
			$colorEntries.map(({id}) => [
				id,
				{
					...($selectedCombinations?.[id] || {}),
					[fgId]: id === fgId ? false : !areAllSelected
				}
			])
		);
	};
</script>

<fieldset>
	<legend>Color pairs</legend>

	<div class="fieldset-fields">
		{#if $colorEntries.length}
			<table>
				<thead>
					<tr>
						<th>
							<button
								class="button button--inline "
								title="Select all colors"
								on:click={selectAll}
							>
								↘
							</button>
						</th>

						{#each $colorEntries as { id, name, rgbColor } (id)}
							<th>
								<button
									class="button button--inline "
									title="Select all colors with foreground {name}"
									on:click={() => selectForegrounds(id)}
								>
									<span
										title="Foreground: {name}"
										style="color: {hexColor(rgbColor)}"
									>
										T
									</span>
								</button>
							</th>
						{/each}
					</tr>
				</thead>

				<tbody>
					{#each $colorEntries as { id: bgId, name, color, rgbColor }, bgIndex (bgId)}
						<tr
							style="--cbg: {hexColor(
								rgbColor
							)}; --cbg-soft: {cssColor({
								...rgbColor,
								alpha: 0.5
							})}; --cbg-light: {cssColor({
								...color,
								l: 95,
								alpha: 0.5
							})}; --cbg-dark: {cssColor({
								...color,
								l: 5,
								alpha: 0.5
							})};"
						>
							<th scope="row">
								<button
									class="button button--inline "
									title="Select all colors with background {name}"
									style="background: {hexColor(
										rgbColor
									)}"
									on:click={() =>
										selectBackgrounds(bgId)}
								/>
							</th>

							{#each $colorEntries as { id: fgId }, fgIndex (fgId)}
								{@const level = levelFn(
									rgbColor,
									$colorEntries[fgIndex].rgbColor
								)}

								<td
									style="--cfg: {hexColor(
										$colorEntries[fgIndex].rgbColor
									)}; --cfg-soft: {cssColor({
										...$colorEntries[fgIndex].rgbColor,
										alpha: 0.1
									})};"
								>
									{#if fgIndex !== bgIndex}
										<input
											type="checkbox"
											id="combination-{bgId}-{fgId}"
											checked={$selectedCombinations?.[
												bgId
											]?.[fgId]}
											on:change={(e) => {
												if (
													bgId in
													$selectedCombinations
												) {
													$selectedCombinations[
														bgId
													][fgId] =
														e.target.checked;
												} else {
													$selectedCombinations[
														bgId
													] = {
														[fgId]:
															e.target.checked
													};
												}
											}}
										/>

										<label
											class="combination"
											class:invalid={level <
												$minLevel}
											for="combination-{bgId}-{fgId}"
											title="{$colorEntries[fgIndex]
												.name} on {name}"
										>
											<span
												class="background button button--inline"
											>
												<span class="foreground">
													T
												</span>
											</span>
										</label>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</fieldset>

<style>
	table {
		margin-bottom: 0;
		border-collapse: collapse;
	}

	tr :first-child {
		border-left: 0;
	}

	tr :last-child {
		border-right: 0;
	}

	thead th {
		border-top: 0;
	}

	tbody tr:last-child th,
	tbody tr:last-child td {
		border-bottom: 0;
	}

	th,
	td {
		border: 5px solid transparent;
		padding: 0;
	}

	th .button {
		width: 100%;
	}

	.button {
		width: 100%;
		height: 100%;
		text-align: center;
	}

	button:empty::after {
		content: '\200b';
	}

	input {
		display: none;
	}

	.combination {
		display: block;
		box-sizing: border-box;
		height: 100%;
	}

	.background {
		display: inline-block;
		box-sizing: border-box;
		background: repeating-linear-gradient(
			120deg,
			transparent 0 calc(0.5ch - 1px),
			var(--cbg) 0.5ch,
			transparent calc(0.5ch + 1px)
		);
		/*
		background-color: var(--cbg-light);
		background-color: transparent;
		background-image: repeating-linear-gradient(
				45deg,
				var(--cbg-dark) 25%,
				transparent 25%,
				transparent 75%,
				var(--cbg-dark) 75%,
				var(--cbg-dark)
			),
			repeating-linear-gradient(
				45deg,
				var(--cbg-dark) 25%,
				var(--cbg-light) 25%,
				var(--cbg-light) 75%,
				var(--cbg-dark) 75%,
				var(--cbg-dark)
			);
		background-position: 0 0, 0.1875rem 0.1875rem;
		background-size: 0.375rem 0.375rem;
		*/

		//background-attachment: fixed;
	}

	.foreground {
		font-family: var(--font-sans);
		background: repeating-linear-gradient(
			120deg,
			var(--cfg-soft) 0 calc(0.25ch - 1px),
			var(--cfg) 0.25ch,
			var(--cfg-soft) calc(0.25ch + 1px) calc(0.5ch - 1px),
			var(--cfg) 0.5ch,
			var(--cfg-soft) calc(0.5ch + 1px)
		);
		background-clip: text;
		-webkit-background-clip: text;
		color: var(--cfg-soft);
		background-attachment: fixed;
		background-position: top left;
	}

	.combination:hover .background,
	.combination:focus .background {
		background: var(--cbg);
	}

	.combination:hover .foreground,
	.combination:focus .foreground {
		color: var(--cfg-soft);
	}

	input ~ .invalid {
		opacity: 0.2;
	}

	input:checked ~ .combination,
	.combination:hover,
	.combination:focus {
		opacity: 1;
	}

	input:checked ~ .combination .background {
		box-shadow: 0 0 0 1px var(--fg), inset 0 0 0 1px var(--bg);
		background: var(--cbg) !important;
	}

	input:checked ~ .combination .foreground {
		color: var(--cfg) !important;
	}

	input:checked ~ .invalid .foreground {
		text-decoration: solid line-through currentColor 0.25ex;
	}
</style>
