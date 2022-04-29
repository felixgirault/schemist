<script lang="ts">
	import Sample from '$lib/components/Sample.svelte';
	import type {ExportEntry} from '$lib/components/export/Export.svelte';

	export let entries: ExportEntry[];

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
				<td />
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
