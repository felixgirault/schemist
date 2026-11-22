<script lang="ts">
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import type {RgbColor} from '#lib/color/types.js';
	import WarningIcon from '#lib/components/icons/WarningIcon.svelte';
	import {simulation} from '#lib/core/contrast.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import {round} from '#lib/utils/math.js';

	let colors = $derived(combinations.comparedColors);
	let byId = $derived(
		new Map(combinations.differences.map((d) => [d.id, d]))
	);
	let open = $derived(combinations.openDifference);

	const handleOpen = (id: string) => {
		combinations.openDifferenceId =
			combinations.openDifferenceId === id ? null : id;
	};

	const isBelow = (minLevel: number) =>
		minLevel < combinations.minDifference;

	const hex = (color: RgbColor) => formatRgbToHex(color);
</script>

{#snippet swatch(color: RgbColor)}
	<span class="swatch" style="background: {hex(color)};"></span>
{/snippet}

<div>
	{#if colors.length > 1}
		<div class="scroller">
			<table class="matrix">
				<thead>
					<tr>
						<td></td>
						{#each colors.slice(0, -1) as { id, name, rgbColor } (id)}
							<th scope="col" title={name}>
								{@render swatch(rgbColor)}
								<span class="hidden">{name}</span>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each colors.slice(1) as row, j (row.id)}
						<tr>
							<th scope="row" title={row.name}>
								{@render swatch(row.rgbColor)}
								<span class="hidden">{row.name}</span>
							</th>
							{#each colors.slice(0, j + 1) as column (column.id)}
								{@const pair = byId.get(
									`${column.id}-${row.id}`
								)}
								<td>
									{#if pair}
										{@const below = isBelow(
											pair.minLevel
										)}
										<button
											class="cell"
											class:cell--below={below}
											aria-pressed={open?.id ===
												pair.id}
											aria-label="{column.name} and {row.name}: {round(
												pair.minLevel,
												1
											)}{below
												? ', below the minimum'
												: ''}"
											onclick={() =>
												handleOpen(pair.id)}
										>
											{#if below}
												<WarningIcon />
											{:else}
												{round(pair.minLevel, 0)}
											{/if}
										</button>
									{/if}
								</td>
							{/each}
							{#each colors.slice(j + 1, -1) as _}
								<td></td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if open}
			{@const rows = [
				{type: null, level: open.level},
				...open.simulated
			]}
			<section class="details elevated" aria-live="polite">
				<h3 class="h3">{open.a.name} & {open.b.name}</h3>
				<ul>
					{#each rows as { type, level } (type)}
						{@const simulate = type
							? simulation(type)
							: null}
						<li class="row">
							<span class="type">
								{type ?? 'normal vision'}
							</span>
							{@render swatch(
								simulate
									? simulate(open.a.rgbColor)
									: open.a.rgbColor
							)}
							{@render swatch(
								simulate
									? simulate(open.b.rgbColor)
									: open.b.rgbColor
							)}
							<strong>{round(level, 1)}</strong>
							{#if isBelow(level)}
								<WarningIcon />
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{:else}
		<p>Select at least two colors to compare.</p>
	{/if}
</div>

<style>
	.scroller {
		overflow-x: auto;
	}

	/* Overrides the global table styles, made for data tables. */
	.matrix {
		width: auto;
		margin: 0;
		border-collapse: separate;
		border-spacing: 2px;
	}

	th,
	td {
		padding: 0;
		border: 0;
		font-weight: normal;
		text-align: center;
		vertical-align: middle;
		white-space: nowrap;
	}

	th[scope='row'] {
		position: sticky;
		left: 0;
		background: var(--bg);
	}

	.swatch {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border: 1px solid currentColor;
		border-radius: 50%;
		vertical-align: middle;
	}

	.cell {
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: 2rem;
		height: 1.75rem;
		padding: 0;
		color: inherit;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius);
		font: inherit;
		font-size: 0.875rem;
		white-space: nowrap;
		cursor: pointer;
	}

	.cell[aria-pressed='true'] {
		background: var(--shadow);
	}

	.cell--below {
		border: 2px dashed currentColor;
	}

	.cell :global(svg),
	.row :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	.details {
		width: fit-content;
		max-width: 100%;
		margin-top: 1rem;
		padding: 1rem;
		border-radius: var(--radius);
		background: var(--bg);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
	}

	.type {
		min-width: 14ch;
		font-variant: small-caps;
	}
</style>
