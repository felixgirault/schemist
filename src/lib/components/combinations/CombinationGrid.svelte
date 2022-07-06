<script lang="ts">
	import {hexColor} from '$lib/color/spaces';
	import Combination from '$lib/components/combinations/Combination.svelte';
	import ContrastTypeFilter from '$lib/components/combinations/ContrastTypeFilter.svelte';
	import LuminosityFilter from '$lib/components/combinations/LuminosityFilter.svelte';
	import {
		colorEntries,
		combinations,
		previewedCombinationUid,
		selectedCombinations
	} from '$lib/stores/combinations';
	import Sample from '../Sample.svelte';

	const handlePreview = (uid: string) => {
		$previewedCombinationUid =
			$previewedCombinationUid === uid ? null : uid;
	};

	$: colorCount = $colorEntries?.length || 0;
</script>

<div class="data-layout">
	<div class="data-options-track">
		{#if colorCount > 1}
			<div class="data-options form">
				<ContrastTypeFilter />
				<LuminosityFilter />
			</div>
		{/if}
	</div>

	<div>
		{#if $colorEntries.length}
			<table>
				<caption>Test</caption>

				<thead>
					<tr>
						<td />
						{#each $colorEntries as { id, name, rgbColor } (id)}
							<th scope="col">
								<span
									title="Foreground: {name}"
									style="color: {hexColor(rgbColor)}"
								>
									Tt
								</span>
							</th>
						{/each}
					</tr>
				</thead>

				<tbody>
					{#each $colorEntries as { id: bgId, name, rgbColor }, bgIndex (bgId)}
						<tr style="--cbg: {hexColor(rgbColor)};">
							<th scope="row">
								<Sample
									color={hexColor(rgbColor)}
									title="background: {name}"
								/>
							</th>
							{#each $colorEntries as { id: fgId }, fgIndex (fgId)}
								<td
									class="combination"
									style="--cfg: {hexColor(
										$colorEntries[fgIndex].rgbColor
									)};"
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
											for="combination-{bgId}-{fgId}"
										>
											Tt
										</label>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		{:else if colorCount > 1}
			<p>
				There is no color combination matching the selected
				filters.
				<br />
				Try adding more colors to your palette or changing filters.
			</p>
		{:else}
			<p>
				Add colors to your palette to try color combinations.
			</p>
		{/if}

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

	table {
		width: auto;
		caption-side: bottom;
	}

	.combination {
		padding: 0;
		font-weight: bold;
	}

	.combination label {
		display: inline-block;
		padding: 0.5rem;
		background: var(--cbg);
		color: var(--cfg);
		font-weight: bolder;
		font-family: var(--font-sans);
		opacity: 0.1;
		width: 5ch;
	}

	input {
		display: none;
	}

	.combination:hover,
	input:checked ~ label {
		opacity: 1;
		outline: 1px solid var(--fg);
	}

	.list :global(.sample) {
		width: 1.5rem;
		height: 1.5rem;
	}
</style>
