<script lang="ts">
	import Sample from '#lib/components/Sample.svelte';
	import type {
		Requirements,
		VariantEntries
	} from '#lib/core/export.js';
	import {requirementRows} from '#lib/core/export.js';

	interface Props {
		// a column per variant, one unnamed without variants
		variants: VariantEntries[];
		requirements: Requirements;
	}

	let {variants, requirements}: Props = $props();

	// The colors of the base name the rows.
	let entries = $derived(variants[0].entries);
	// The rows of each variant, the same pairs in the same order.
	let rowsByVariant = $derived(
		variants.map((v) =>
			requirementRows(v.entries, requirements)
		)
	);
	let rows = $derived(rowsByVariant[0]);
	const label = (title: string, name: string) =>
		name ? `${title} in ${name}` : title;

	const highlight = (color: string) =>
		color.replace(
			/^([a-z]+\()(.*)(\))$/i,
			'<span>$1</span>$2<span>$3</span>'
		);
</script>

<div>
	<table>
		<thead>
			<tr>
				<td></td>
				<th>Name</th>
				{#each variants as { name }}
					<th>{label('Value', name)}</th>
				{/each}
			</tr>
		</thead>

		<tbody>
			{#each entries as { id, name }, i (id)}
				{#if variants[0].entries[i].cssColor}
					<tr>
						<td>
							<Sample
								color={variants[0].entries[i].cssColor}
							/>
						</td>
						<td>{name}</td>
						{#each variants as { entries: list }}
							<td>{@html highlight(list[i].cssColor)}</td>
						{/each}
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>

	{#if rows.length}
		<h3 class="h3">Requirements</h3>

		<table>
			<thead>
				<tr>
					<th>Foreground</th>
					<th>Background</th>
					<th>Use</th>
					<th>Targets</th>
					{#each variants as { name }}
						<th>{label('Status', name)}</th>
					{/each}
				</tr>
			</thead>

			<tbody>
				{#each rows as { id, fg, bg, use, targets }, i (id)}
					<tr>
						<td>{fg}</td>
						<td>{bg}</td>
						<td>{use}</td>
						<td>{targets}</td>
						{#each rowsByVariant as list}
							<td>{list[i].pass ? 'met' : 'not met'}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	div {
		overflow-x: auto;
	}

	td,
	th {
		white-space: nowrap;
	}

	td:last-child {
		width: 100%;
	}

	td :global(.sample) {
		width: 1.5rem;
		height: 1.5rem;
	}

	td :global(span) {
		color: var(--bg-neutral);
		font-weight: bold;
	}
</style>
