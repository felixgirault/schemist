<script lang="ts">
	import {
		wcag2Contrast,
		wcag3Contrast
	} from '#lib/color/contrast.js';
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import type {Node} from '#lib/stores/nodes.svelte.js';

	let levelFn = $derived(
		combinations.contrastType === 'wcag2'
			? wcag2Contrast
			: wcag3Contrast
	);

	let entries = $derived(combinations.colorEntries);

	const selectOne = (
		bgId: Node['id'],
		fgId: Node['id'],
		selected: boolean
	) => {
		combinations.selected[bgId] = {
			...combinations.selected[bgId],
			[fgId]: selected
		};
	};

	const selectAll = () => {
		const areAllSelected = entries.every(({id: bgId}) =>
			entries.every(
				({id: fgId}) =>
					bgId === fgId ||
					combinations.selected[bgId]?.[fgId]
			)
		);

		combinations.selected = Object.fromEntries(
			entries.map(({id: bgId}) => [
				bgId,
				Object.fromEntries(
					entries.map(({id: fgId}) => [
						fgId,
						bgId === fgId ? false : !areAllSelected
					])
				)
			])
		);
	};

	const selectBackgrounds = (bgId: Node['id']) => {
		const areAllSelected = entries.every(
			({id}) =>
				id === bgId || combinations.selected[bgId]?.[id]
		);

		combinations.selected[bgId] = Object.fromEntries(
			entries.map(({id}) => [
				id,
				id === bgId ? false : !areAllSelected
			])
		);
	};

	const selectForegrounds = (fgId: Node['id']) => {
		const areAllSelected = entries.every(
			({id}) =>
				id === fgId || combinations.selected[id]?.[fgId]
		);

		combinations.selected = Object.fromEntries(
			entries.map(({id}) => [
				id,
				{
					...combinations.selected[id],
					[fgId]: id === fgId ? false : !areAllSelected
				}
			])
		);
	};
</script>

<fieldset>
	<legend>Color pairs</legend>

	<div class="fieldset-fields">
		{#if entries.length}
			<table>
				<thead>
					<tr>
						<th>
							<button
								class="button button--inline"
								title="Select all colors"
								onclick={selectAll}
							>
								↘
							</button>
						</th>

						{#each entries as { id, name, rgbColor } (id)}
							<th>
								<button
									class="button button--inline"
									title="Select all colors with foreground {name}"
									data-name={name}
									onclick={() => selectForegrounds(id)}
								>
									<span
										title="Foreground: {name}"
										style="color: {formatRgbToHex(
											rgbColor
										)}"
									>
										T
									</span>
								</button>
							</th>
						{/each}
					</tr>
				</thead>

				<tbody>
					{#each entries as { id: bgId, name, color, rgbColor }, bgIndex (bgId)}
						<tr style="--cbg: {formatRgbToHex(rgbColor)};">
							<th scope="row">
								<button
									class="button button--inline"
									title="Select all colors with background {name}"
									style="background: {formatRgbToHex(
										rgbColor
									)}"
									data-name={name}
									onclick={() =>
										selectBackgrounds(bgId)}
								></button>
							</th>

							{#each entries as { id: fgId }, fgIndex (fgId)}
								{@const level = levelFn(
									rgbColor,
									entries[fgIndex].rgbColor
								)}

								<td
									style="--cfg: {formatRgbToHex(
										entries[fgIndex].rgbColor
									)};"
								>
									{#if fgIndex !== bgIndex}
										<input
											type="checkbox"
											id="combination-{bgId}-{fgId}"
											checked={combinations
												.selected?.[bgId]?.[fgId]}
											onchange={(e) => {
												selectOne(
													bgId,
													fgId,
													e.currentTarget.checked
												);
											}}
										/>

										<label
											class="combination"
											class:invalid={level <
												combinations.minLevel}
											for="combination-{bgId}-{fgId}"
											title="{entries[fgIndex]
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
		box-shadow:
			0 0.1rem 0.5rem 0 var(--shadow),
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
