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

	const selectOne = (bgId, fgId, selected) => {
		if (bgId in $selectedCombinations) {
			$selectedCombinations[bgId][fgId] = selected;
		} else {
			$selectedCombinations[bgId] = {
				[fgId]: selected
			};
		}
	};

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
								class="button button--inline"
								title="Select all colors"
								on:click={selectAll}
							>
								↘
							</button>
						</th>

						{#each $colorEntries as { id, name, rgbColor } (id)}
							<th>
								<button
									class="button button--inline"
									title="Select all colors with foreground {name}"
									data-name={name}
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
									class="button button--inline"
									title="Select all colors with background {name}"
									style="background: {hexColor(
										rgbColor
									)}"
									data-name={name}
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
												selectOne(
													bgId,
													fgId,
													e.target.checked
												);
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

	[data-name] {
		position: relative;
	}

	[data-name]::before {
		position: absolute;
		box-shadow: 0 0.1rem 0.5rem 0 var(--shadow),
			0 0.5rem 2rem 0 var(--shadow);
		border-radius: var(--radius);
		border: 1px solid var(--bg);
		background: var(--fg);
		color: var(--bg);
	}

	table:hover [data-name]::before,
	table:focus-within [data-name]::before {
		content: attr(data-name) ' ';
	}

	thead th [data-name]::before {
		right: 25%;
		bottom: calc(100% + 0.5rem);
		padding: 0.5rem 0.15rem;
		height: max-content;
		writing-mode: vertical-rl;
		text-orientation: mixed;
		transform: rotate(-45deg);
		transform-origin: bottom;
	}

	th[scope='row'] [data-name]::before {
		top: 0;
		right: calc(100% + 0.5rem);
		padding: 0.15rem 0.5rem;
		width: max-content;
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
		opacity: 0.3;
	}

	.background {
		display: inline-block;
		box-sizing: border-box;
		background: var(--cbg);
	}

	.combination .background {
		border-radius: 2rem;
	}

	.foreground {
		font-family: var(--font-sans);
		color: var(--cfg);
	}

	.combination:hover .background,
	.combination:focus .background {
		background: var(--cbg);
	}

	.combination:hover .foreground,
	.combination:focus .foreground {
		color: var(--cfg);
	}

	input ~ .invalid {
		opacity: 0.1;
	}

	input:checked ~ .combination,
	.combination:hover,
	.combination:focus {
		opacity: 1;
		transform: scale(100%);
	}

	input:checked ~ .invalid {
		opacity: 0.6;
	}

	input:checked ~ .combination .background {
		border-radius: calc(var(--radius) / 2);
	}
</style>
