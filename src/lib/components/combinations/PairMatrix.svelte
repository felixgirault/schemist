<script lang="ts">
	import {wcag2Contrast} from '#lib/color/contrast.js';
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import type {RgbColor} from '#lib/color/types.js';
	import CheckIcon from '#lib/components/icons/CheckIcon.svelte';
	import WarningIcon from '#lib/components/icons/WarningIcon.svelte';
	import {simulation} from '#lib/core/contrast.js';
	import type {PaletteColor} from '#lib/core/evaluate.js';
	import type {TargetCheck} from '#lib/core/pairs.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import type {PairGroup} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import {round} from '#lib/utils/math.js';
	import './matrix.css';

	let colors = $derived(combinations.pairColors);
	let groups = $derived(combinations.groups);
	// Groups only show once a role exists; before, Other is the grid.
	let hasGroups = $derived(palette.roles.length > 0);
	let columnCount = $derived(
		groups.reduce(
			(n, group) =>
				n +
				(combinations.isCollapsed(group)
					? 1
					: group.colors.length),
			0
		)
	);
	let byId = $derived(
		new Map(combinations.pairChecks.map((c) => [c.id, c]))
	);
	let open = $derived(combinations.openPair);
	let unsavedNames = $derived([
		...new Set([
			...palette.unsavedPairs.flatMap(({names}) => names),
			...palette.unsavedMembers
		])
	]);

	// Shows the pair, or closes it when it is shown already.
	const handleCell = (fg: PaletteColor, bg: PaletteColor) => {
		const same =
			open?.fg.id === fg.id && open?.bg.id === bg.id;

		combinations.openPairIds = same
			? null
			: {fg: fg.id, bg: bg.id};
	};

	// The simulated levels of each target, for tooltips and names.
	const simulations = (checks: TargetCheck[] = []) =>
		checks
			.flatMap(({target, simulated}) =>
				simulated.map(
					({type, level}) =>
						`, ${type} ${target} ${round(level, 1)}`
				)
			)
			.join('');

	// What a declared pair is for, for tooltips and names.
	const forNames = (check?: {
		for: {uses: {name: string}[]; custom: boolean};
	}) =>
		check
			? [
					...check.for.uses.map(({name}) => name),
					...(check.for.custom ? ['Custom'] : [])
				].join(', ')
			: '';

	const hex = (color: RgbColor) => formatRgbToHex(color);

	const titleOf = (id: string, name: string) => {
		const roles = combinations.rolesOf.get(id);

		return roles ? `${name}, ${roles.join(', ')}` : name;
	};
</script>

{#snippet swatch(color: RgbColor)}
	<span class="swatch" style="background: {hex(color)};"></span>
{/snippet}

{#snippet cell(row: PaletteColor, column: PaletteColor)}
	{@const check = byId.get(`${row.id}-${column.id}`)}
	<button
		class="cell pair-cell"
		class:pair-cell--tall={combinations.blindnessTypes.length}
		class:pair-cell--declared={check}
		class:pair-cell--off={check && !check.pass}
		class:pair-cell--rule={combinations.outlinedCells?.has(
			`${row.id}-${column.id}`
		)}
		style="--cell-bg: {hex(row.rgbColor)}; --cell-fg: {hex(
			column.rgbColor
		)};"
		title="{column.name} on {row.name}, {round(
			wcag2Contrast(row.rgbColor, column.rgbColor),
			1
		)}:1{simulations(check?.checks)}{check
			? ', for ' + forNames(check)
			: ''}"
		aria-pressed={open?.fg.id === column.id &&
			open?.bg.id === row.id}
		aria-label="{column.name} on {row.name}: {check
			? check.pass
				? 'meets its targets'
				: 'does not meet its targets'
			: 'not declared'}{simulations(check?.checks)}{check
			? ', for ' + forNames(check)
			: ''}"
		onclick={() => handleCell(column, row)}
	>
		<span class="preview" aria-hidden="true">
			Aa
			{#if combinations.blindnessTypes.length}
				<span class="strips">
					{#each combinations.blindnessTypes as type (type)}
						{@const simulate = simulation(type)}
						<span
							class="strip"
							style="--cell-bg: {hex(
								simulate(row.rgbColor)
							)}; --cell-fg: {hex(
								simulate(column.rgbColor)
							)};"
						></span>
					{/each}
				</span>
			{/if}
		</span>
		{#if check}
			<!-- drawn in the panel's colors, readable whatever the pair -->
			<span class="badge">
				{#if check.pass}
					<CheckIcon />
				{:else}
					<WarningIcon />
				{/if}
			</span>
		{/if}
	</button>
{/snippet}

{#snippet toggle(group: PairGroup, isCollapsed: boolean)}
	<button
		class="button group-toggle"
		aria-expanded={!isCollapsed}
		title="{group.colors.length} {group.colors.length === 1
			? 'color'
			: 'colors'}"
		onclick={() => combinations.toggleGroup(group.id)}
	>
		{group.name}
		<span aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
	</button>
{/snippet}

{#if unsavedNames.length}
	<p class="hint" role="status">
		Pairs and roles on these colors are not in the permalink
		until they get distinct names: {unsavedNames
			.map((name) => `"${name}"`)
			.join(', ')}.
	</p>
{/if}

{#if colors.length > 1}
	<p class="hint">
		Each cell shows a foreground (column) on a background
		(row). Activate one to open it. {combinations.pairChecks
			.length} declared.
	</p>

	<div class="scroller">
		<table class="matrix">
			<caption class="hidden">
				Declared pairs, backgrounds in rows and foregrounds
				in columns, by role
			</caption>
			<thead>
				{#if hasGroups}
					<tr>
						<td colspan="2"></td>
						{#each groups as group (group.id)}
							{@const isCollapsed =
								combinations.isCollapsed(group)}
							<th
								scope="colgroup"
								colspan={isCollapsed
									? 1
									: group.colors.length}
								class="group"
								class:group--collapsed={isCollapsed}
							>
								{@render toggle(group, isCollapsed)}
							</th>
						{/each}
					</tr>
				{/if}
				<tr>
					<td colspan={hasGroups ? 2 : 1}></td>
					{#each groups as group (group.id)}
						{#if combinations.isCollapsed(group)}
							<td></td>
						{:else}
							{#each group.colors as { id, name, rgbColor } (id)}
								<th
									scope="col"
									title={titleOf(id, name)}
								>
									{@render swatch(rgbColor)}
									<span class="hidden">{name}</span>
								</th>
							{/each}
						{/if}
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each groups as rowGroup (rowGroup.id)}
					{#if combinations.isCollapsed(rowGroup)}
						<tr>
							{#if hasGroups}
								<th scope="rowgroup" class="group">
									{@render toggle(rowGroup, true)}
								</th>
							{/if}
							<td colspan={1 + columnCount}></td>
						</tr>
					{:else}
						{#each rowGroup.colors as row, i (row.id)}
							<tr>
								{#if hasGroups && i === 0}
									<th
										scope="rowgroup"
										class="group group--rows"
										rowspan={rowGroup.colors.length}
									>
										{@render toggle(rowGroup, false)}
									</th>
								{/if}
								<th
									scope="row"
									title={titleOf(row.id, row.name)}
								>
									{@render swatch(row.rgbColor)}
									<span class="hidden">{row.name}</span>
								</th>
								{#each groups as colGroup (colGroup.id)}
									{#if combinations.isCollapsed(colGroup)}
										<td></td>
									{:else}
										{#each colGroup.colors as column (column.id)}
											<td>
												{#if column.id !== row.id}
													{@render cell(
														row,
														column
													)}
												{/if}
											</td>
										{/each}
									{/if}
								{/each}
							</tr>
						{/each}
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<p>Select at least two colors to compare.</p>
{/if}

<style>
	/* At least the panel's width; a table never shrinks below its
	content, so many colors still scroll. */
	:global(.matrix-panel) :global(.matrix) {
		width: 100%;
		border-spacing: 4px;
	}

	:global(.matrix-panel) th[scope='row'] {
		width: 1%;
	}

	/* The border marks declared pairs, so that the outline stays
	the focus ring. */
	:global(.matrix-panel) .pair-cell {
		position: relative;
		width: 100%;
		min-width: 2rem;
		height: 2rem;
		border: 2px solid transparent;
	}

	:global(.matrix-panel) .pair-cell--tall {
		height: 2.75rem;
	}

	/* A group's header: a vertical label over a column group once
	collapsed, and for the rows. */
	.group {
		font-size: 0.875rem;
	}

	.group--collapsed .group-toggle,
	.group--rows .group-toggle,
	th[scope='rowgroup'] .group-toggle {
		writing-mode: vertical-rl;
	}

	.strips {
		display: flex;
		gap: 2px;
		width: 80%;
	}

	/* A bar in the simulated foreground on the simulated background. */
	.strip {
		flex: 1;
		height: 0.5rem;
		border-radius: 2px;
		background: linear-gradient(var(--cell-fg), var(--cell-fg))
			center / 60% 0.2rem no-repeat var(--cell-bg);
		border: 1px solid currentColor;
	}

	.preview {
		display: flex;
		align-items: center;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		width: 100%;
		height: 100%;
		border-radius: calc(var(--radius) - 2px);
		background: var(--cell-bg);
		color: var(--cell-fg);
		font-family: var(--font-sans);
		font-weight: 600;
	}

	:global(.matrix-panel) .pair-cell--declared {
		border-color: var(--fg);
	}

	:global(.matrix-panel) .pair-cell--off {
		border-style: dashed;
	}

	/* A rule's cells: a ring around them, where Look at only dims. */
	:global(.matrix-panel) .pair-cell--rule {
		z-index: 1;
		box-shadow:
			0 0 0 3px Highlight,
			0 0 0 5px var(--bg);
	}

	:global(.matrix-panel) .pair-cell[aria-pressed='true'] {
		z-index: 1;
		transform: scale(1.15);
	}

	.badge {
		position: absolute;
		top: -0.45rem;
		right: -0.45rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 0.9rem;
		height: 0.9rem;
		border-radius: 50%;
		background: var(--bg);
		color: var(--fg);
	}

	:global(.matrix-panel) .badge :global(svg) {
		width: 0.65rem;
		height: 0.65rem;
	}
</style>
