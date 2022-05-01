<script lang="ts">
	import {hexColor} from '$lib/color/spaces';
	import BlindnessFilter from '$lib/components/combinations/BlindnessFilter.svelte';
	import ColorFilter from '$lib/components/combinations/ColorFilter.svelte';
	import Combination from '$lib/components/combinations/Combination.svelte';
	import ContrastFilter from '$lib/components/combinations/ContrastFilter.svelte';
	import ContrastTypeFilter from '$lib/components/combinations/ContrastTypeFilter.svelte';
	import LuminosityFilter from '$lib/components/combinations/LuminosityFilter.svelte';
	import {
		colorEntries,
		cross,
		previewedCombinationUid,
		selectedCombinations
	} from '$lib/stores/combinations';
	import Sample from '../Sample.svelte';

	const handlePreview = (uid: string) => {
		$previewedCombinationUid =
			$previewedCombinationUid === uid ? null : uid;
	};

	$: colorCount = $colorEntries?.length || 0;

	let a = $cross.map(() => {});
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

	<div class="list">
		<!-- Using a keyed each here worsens performances as it causes layout shifts -->
		{#if $cross.length}
			<table>
				<caption>Test</caption>

				<thead>
					<tr>
						<td />
						{#each $cross as { id, name, rgb } (id)}
							<th scope="col">
								<span title="Foreground: {name}">
									Tt
								</span>
							</th>
						{/each}
					</tr>
				</thead>

				<tbody>
					{#each $cross as { id, name, rgb, bgs }, j (id)}
						<tr>
							<th scope="row">
								<Sample
									color={hexColor(rgb)}
									title="Background: {name}"
								/>
							</th>
							{#each bgs as { grade }, i ($cross[i].id)}
								<td
									class="combination"
									style="--cbg: {hexColor(
										$cross[i].rgb
									)}; --cfg: {hexColor(rgb)};"
								>
									{#if i !== j}
										<input
											type="checkbox"
											id="combination-{j}-{i}"
											checked={$selectedCombinations?.[
												$cross[i].id
											]?.[id]}
											onchange={(e) => {
												$selectedCombinations[
													$cross[i].id
												][id] = e.target.checked;
											}}
										/>
										<label for="combination-{j}-{i}">
											{grade}
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
