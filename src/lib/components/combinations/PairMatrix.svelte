<script lang="ts">
	import {wcag2Contrast} from '#lib/color/contrast.js';
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import type {RgbColor} from '#lib/color/types.js';
	import CheckIcon from '#lib/components/icons/CheckIcon.svelte';
	import WarningIcon from '#lib/components/icons/WarningIcon.svelte';
	import {simulation} from '#lib/core/contrast.js';
	import type {PairTargets} from '#lib/core/nodes.js';
	import {targetNames} from '#lib/core/pairs.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import {round} from '#lib/utils/math.js';
	import './matrix.css';

	const labels = {
		wcag2: 'WCAG 2 contrast',
		apca: 'APCA contrast',
		difference: 'Color difference'
	};

	let colors = $derived(combinations.comparedColors);
	let byId = $derived(
		new Map(combinations.pairChecks.map((c) => [c.id, c]))
	);
	let open = $derived(combinations.openPair);
	let unsavedNames = $derived([
		...new Set(
			palette.unsavedPairs.flatMap(({names}) => names)
		)
	]);

	const handleOpen = (fg: string, bg: string) => {
		const {openPairIds: ids} = combinations;

		combinations.openPairIds =
			ids?.fg === fg && ids.bg === bg ? null : {fg, bg};
	};

	// Committed on change, so that a half-typed number does not
	// remove the pair.
	const handleTarget = (
		name: (typeof targetNames)[number],
		event: Event
	) => {
		if (!open) return;

		const text = (event.currentTarget as HTMLInputElement)
			.value;
		const value =
			text.trim() === '' ? undefined : Number(text);

		if (value !== undefined && !Number.isFinite(value)) return;

		const targets: PairTargets = {
			...open.check?.pair,
			[name]: value
		};

		palette.setPair(open.nodes.fg, open.nodes.bg, targets);
	};

	const handleRemove = () => {
		if (open)
			palette.setPair(open.nodes.fg, open.nodes.bg, {});
	};

	const hex = (color: RgbColor) => formatRgbToHex(color);
</script>

{#snippet swatch(color: RgbColor)}
	<span class="swatch" style="background: {hex(color)};"></span>
{/snippet}

<div class="matrix-panel">
	{#if unsavedNames.length}
		<p class="hint" role="status">
			Pairs on these colors are not in the permalink until
			they get distinct names: {unsavedNames
				.map((name) => `"${name}"`)
				.join(', ')}.
		</p>
	{/if}

	{#if colors.length > 1}
		<p class="hint">
			Each cell shows a foreground (column) on a background
			(row). Activate one to declare the pair and set its
			targets.
		</p>

		<div class="scroller">
			<table class="matrix">
				<caption class="hidden">
					Declared pairs, backgrounds in rows and
					foregrounds in columns
				</caption>
				<thead>
					<tr>
						<td></td>
						{#each colors as { id, name, rgbColor } (id)}
							<th scope="col" title={name}>
								{@render swatch(rgbColor)}
								<span class="hidden">{name}</span>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each colors as row (row.id)}
						<tr>
							<th scope="row" title={row.name}>
								{@render swatch(row.rgbColor)}
								<span class="hidden">{row.name}</span>
							</th>
							{#each colors as column (column.id)}
								<td>
									{#if column.id !== row.id}
										{@const check = byId.get(
											`${row.id}-${column.id}`
										)}
										<button
											class="cell pair-cell"
											class:pair-cell--declared={check}
											class:pair-cell--off={check &&
												!check.pass}
											style="--cell-bg: {hex(
												row.rgbColor
											)}; --cell-fg: {hex(
												column.rgbColor
											)};"
											title="{column.name} on {row.name}, {round(
												wcag2Contrast(
													row.rgbColor,
													column.rgbColor
												),
												1
											)}:1"
											aria-pressed={open?.fg.id ===
												column.id &&
												open?.bg.id === row.id}
											aria-label="{column.name} on {row.name}: {check
												? check.pass
													? 'meets its targets'
													: 'does not meet its targets'
												: 'not declared'}"
											onclick={() =>
												handleOpen(
													column.id,
													row.id
												)}
										>
											<span
												class="preview"
												aria-hidden="true"
											>
												Aa
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
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if open}
			<section class="details elevated" aria-live="polite">
				<h3 class="h3">{open.fg.name} on {open.bg.name}</h3>

				<div class="targets">
					{#each targetNames as name (name)}
						<label>
							{labels[name]}
							<input
								type="number"
								min={0}
								step="any"
								value={open.check?.pair[name] ?? ''}
								onchange={(event) =>
									handleTarget(name, event)}
							/>
						</label>
					{/each}
				</div>

				{#if open.check}
					{#each open.check.checks as { target, goal, level, simulated, pass } (target)}
						{@const rows = [
							{type: null, level},
							...simulated
						]}
						<h4 class="h3">
							{labels[target]}, at least {goal}
							{#if pass}
								<CheckIcon />
								<span class="hidden">met</span>
							{:else}
								<WarningIcon />
								<span class="hidden">not met</span>
							{/if}
						</h4>
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
											? simulate(open.fg.rgbColor)
											: open.fg.rgbColor
									)}
									{@render swatch(
										simulate
											? simulate(open.bg.rgbColor)
											: open.bg.rgbColor
									)}
									<strong>{round(level, 1)}</strong>
									{#if level >= goal}
										<CheckIcon />
										<span class="hidden">met</span>
									{:else}
										<WarningIcon />
										<span class="hidden">not met</span>
									{/if}
								</li>
							{/each}
						</ul>
					{/each}

					<button class="button" onclick={handleRemove}>
						Remove pair
					</button>
				{:else}
					<p class="hint">
						Set a target to declare this pair.
					</p>
				{/if}
			</section>
		{/if}

		{#if combinations.hiddenPairs.length}
			<h3 class="h3">Not checked, a color is hidden</h3>
			<ul>
				{#each combinations.hiddenPairs as { fg, bg } (`${bg.id}-${fg.id}`)}
					<li>{fg.output.name} on {bg.output.name}</li>
				{/each}
			</ul>
		{/if}
	{:else}
		<p>Select at least two colors to compare.</p>
	{/if}
</div>

<style>
	/* At least the panel's width; a table never shrinks below its
	content, so many colors still scroll. */
	.matrix-panel :global(.matrix) {
		width: 100%;
		border-spacing: 4px;
	}

	.matrix-panel th[scope='row'] {
		width: 1%;
	}

	/* The border marks declared pairs, so that the outline stays
	the focus ring. */
	.matrix-panel .pair-cell {
		position: relative;
		width: 100%;
		min-width: 2rem;
		height: 2rem;
		border: 2px solid transparent;
	}

	.preview {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		border-radius: calc(var(--radius) - 2px);
		background: var(--cell-bg);
		color: var(--cell-fg);
		font-family: var(--font-sans);
		font-weight: 600;
	}

	.matrix-panel .pair-cell--declared {
		border-color: var(--fg);
	}

	.matrix-panel .pair-cell--off {
		border-style: dashed;
	}

	.matrix-panel .pair-cell[aria-pressed='true'] {
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

	.matrix-panel .badge :global(svg) {
		width: 0.65rem;
		height: 0.65rem;
	}

	.targets {
		display: grid;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	h4 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	h4 :global(svg) {
		width: 1rem;
		height: 1rem;
	}
</style>
