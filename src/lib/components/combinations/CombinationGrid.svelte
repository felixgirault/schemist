<script lang="ts">
	import Combination from '#lib/components/combinations/Combination.svelte';
	import {combinations} from '#lib/stores/combinations.svelte.js';

	let colors = $derived(combinations.sortedColors);

	const handlePreview = (uid: string) => {
		combinations.previewedUid =
			combinations.previewedUid === uid ? null : uid;
	};

	// uid => combination, only for the pairs passing the filter
	// (worst case across simulations, like the list view)
	let shown = $derived(
		Object.fromEntries(
			combinations.all
				.filter(
					({minLevel}) => minLevel >= combinations.minLevel
				)
				.map((combination) => [combination.uid, combination])
		)
	);

	let rows = $derived(
		colors.filter((bg) =>
			colors.some((fg) => `${bg.id}-${fg.id}` in shown)
		)
	);

	let columns = $derived(
		colors.filter((fg) =>
			colors.some((bg) => `${bg.id}-${fg.id}` in shown)
		)
	);
</script>

<div class="grid">
	<table>
		<thead>
			<tr>
				<td></td>
				{#each columns as { id, name } (id)}
					<th scope="col" title="Foreground: {name}">
						<span class="name">{name}</span>
					</th>
				{/each}
			</tr>
		</thead>

		<tbody>
			{#each rows as bg (bg.id)}
				<tr>
					<th scope="row" title="Background: {bg.name}">
						<span class="name">{bg.name}</span>
					</th>

					{#each columns as fg (fg.id)}
						{@const combination =
							shown[`${bg.id}-${fg.id}`]}
						{#if !combination}
							<td></td>
						{:else}
							{@const {
								uid,
								contrast,
								simulatedContrasts
							} = combination}
							<td>
								<Combination
									{uid}
									bgName={bg.name}
									fgName={fg.name}
									{contrast}
									{simulatedContrasts}
									onPreview={handlePreview}
									isCompact
								/>
							</td>
						{/if}
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	/* The combinations section scrolls, so row headings stick to its edge */
	table {
		margin-top: -5ch;
		margin-bottom: 0;
	}

	th {
		padding: 0.5rem;
		font-size: 0.8rem;
		font-weight: normal;
	}

	th[scope='col'] {
		max-height: 15ch;
		text-align: center;
	}

	th[scope='col'] .name {
		writing-mode: sideways-rl;
		vertical-align: bottom;
		transform: rotate(-60deg);
		transform-origin: bottom;
	}

	th[scope='row'] {
		position: sticky;
		left: 0;
		z-index: 1;
		max-width: 15ch;
		background: var(--bg);
		vertical-align: middle;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
	}

	td {
		padding: 2px 2px 1px 1px;
	}
</style>
