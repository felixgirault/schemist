<script lang="ts">
	import Sample from '#lib/components/Sample.svelte';
	import type {
		ExportEntry,
		Requirements
	} from '#lib/core/export.js';
	import {requirementRows} from '#lib/core/export.js';

	interface Props {
		entries: ExportEntry[];
		requirements: Requirements;
	}

	let {entries, requirements}: Props = $props();

	let rows = $derived(requirementRows(entries, requirements));

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
				<th>Value</th>
			</tr>
		</thead>

		<tbody>
			{#each entries as { id, cssColor, name } (id)}
				{#if cssColor}
					<tr>
						<td><Sample color={cssColor} /></td>
						<td>{name}</td>
						<td>{@html highlight(cssColor)}</td>
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
					<th>Status</th>
				</tr>
			</thead>

			<tbody>
				{#each rows as { id, fg, bg, use, targets, pass } (id)}
					<tr>
						<td>{fg}</td>
						<td>{bg}</td>
						<td>{use}</td>
						<td>{targets}</td>
						<td>{pass ? 'met' : 'not met'}</td>
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

	td {
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
