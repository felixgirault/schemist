<script lang="ts">
	import {
		wcag2Contrast,
		wcag2Grade,
		wcag3Contrast,
		wcag3Grade
	} from '$lib/color/contrast';
	import {cssColor, hexColor} from '$lib/color/spaces';
	import Combination from '$lib/components/combinations/Combination.svelte';
	import ContrastTypeFilter from '$lib/components/combinations/ContrastTypeFilter.svelte';
	import LuminosityFilter from '$lib/components/combinations/LuminosityFilter.svelte';
	import {
		colorEntries,
		combinations,
		contrastType,
		minLevel,
		previewedCombinationUid,
		selectedCombinations
	} from '$lib/stores/combinations';
	import {round} from '$lib/utils/math';
	import Sample from '../Sample.svelte';
	import ContrastFilter from './ContrastFilter.svelte';

	const handlePreview = (uid: string) => {
		$previewedCombinationUid =
			$previewedCombinationUid === uid ? null : uid;
	};

	$: colorCount = $colorEntries?.length || 0;

	$: levelFn =
		$contrastType === 'wcag2' ? wcag2Contrast : wcag3Contrast;
	$: gradeFn =
		$contrastType === 'wcag2' ? wcag2Grade : wcag3Grade;

	const selectAll = (bgId) => {
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
						!areAllSelected
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

<div class="data-layout">
	<div class="data-options-track">
		{#if colorCount > 1}
			<div class="data-options form">
				<ContrastTypeFilter />
				<ContrastFilter />
				<LuminosityFilter />
			</div>
		{/if}
	</div>

	<div>
		<div class="table-container">
			{#if $colorEntries.length}
				<div role="table" aria-label="Color combinations">
					<div role="rowgroup">
						<div role="row">
							<div role="columnheader">
								<button
									class="button"
									title="Select all colors"
									on:click={selectAll}
								>
									All
								</button>
							</div>

							{#each $colorEntries as { id, name, rgbColor } (id)}
								<div role="columnheader">
									<button
										class="button"
										title="Select all colors with foreground {name}"
										on:click={() =>
											selectForegrounds(id)}
									>
										<span
											title="Foreground: {name}"
											style="color: {hexColor(
												rgbColor
											)}"
										>
											Tt
										</span>
									</button>
								</div>
							{/each}
						</div>
					</div>

					<div role="rowgroup">
						{#each $colorEntries as { id: bgId, name, color, rgbColor }, bgIndex (bgId)}
							<div
								role="row"
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
								<div role="rowheader">
									<button
										class="button button--icon"
										title="Select all colors with background {name}"
										on:click={() =>
											selectBackgrounds(bgId)}
									>
										<Sample
											color={hexColor(rgbColor)}
											title="background: {name}"
										/>
									</button>
								</div>

								{#each $colorEntries as { id: fgId }, fgIndex (fgId)}
									{@const level = levelFn(
										rgbColor,
										$colorEntries[fgIndex].rgbColor
									)}
									{@const grade = gradeFn(level)}
									{@const roundedLevel = round(
										level,
										1
									)}

									<div
										role="cell"
										style="--cfg: {hexColor(
											$colorEntries[fgIndex].rgbColor
										)}; --cfg-soft: {cssColor({
											...$colorEntries[fgIndex]
												.rgbColor,
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
												title="{$colorEntries[
													fgIndex
												].name} on {name}"
											>
												<span
													class="background button"
												>
													<span class="foreground">
														<span class="grade">
															{grade}
														</span>
														<span class="level">
															({roundedLevel})
														</span>
													</span>
												</span>
											</label>
										{/if}
									</div>
								{/each}
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<p>
					Add colors to your palette to try color
					combinations.
				</p>
			{/if}
		</div>

		<div class="list">
			{#each $combinations as { uid, bgName, fgName, contrast, simulatedContrasts }}
				<Combination
					{uid}
					{bgName}
					{fgName}
					{contrast}
					{simulatedContrasts}
					onPreview={handlePreview}
				/>
			{:else}
				{#if colorCount > 1}
					<p>
						There is no color combination matching the
						selected filters.
						<br />
						Try adding more colors to your palette or changing
						filters.
					</p>
				{:else}
					<p>
						Add colors to your palette to try color
						combinations.
					</p>
				{/if}
			{/each}
		</div>
	</div>
</div>

<style>
	.data-options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(28ch, 1fr));
		gap: 1rem;
		animation: slide-up 250ms ease-out;
		contain: layout;
	}

	.list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(22ch, 1fr));
		gap: 1rem;
		contain: layout;
	}

	.table-container {
		overflow: auto;
	}

	[role='table'] {
		margin-bottom: var(--vgap);
	}

	[role='table'] :global(.sample) {
		width: 1.5rem;
		height: 1.5rem;
	}

	[role='row'] {
		display: grid;
		grid-auto-columns: 1fr;
		grid-template-rows: 1fr;
		gap: 5px;
		align-items: stretch;
		justify-content: stretch;
		margin-bottom: 5px;
	}

	[role='row'] > * {
		grid-row: 1;
	}

	[role='columnheader'] {
		position: sticky;
		top: 0;
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
		border-radius: var(--radius);
		padding: 0.5rem;
		width: 100%;
		height: 100%;
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

	.grade {
		font-weight: bold;
	}

	.level {
		display: none;
		line-height: 1;
		font-size: 0.9rem;
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
		box-shadow: 0 0 0 2px var(--fg), inset 0 0 0 1px var(--fg);
		background: var(--cbg) !important;
	}
	/*
	input:checked ~ .invalid .background {
		outline-color: red;
	}
	*/
	input:checked ~ .combination .foreground {
		color: var(--cfg) !important;
	}

	input:checked ~ .invalid .foreground {
		text-decoration: solid line-through currentColor 0.25ex;
	}
</style>
