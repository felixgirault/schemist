<script lang="ts">
	import {
		wcag2Contrast,
		wcag2Grade,
		wcag3Grade
	} from '#lib/color/contrast.js';
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import type {RgbColor} from '#lib/color/types.js';
	import CheckIcon from '#lib/components/icons/CheckIcon.svelte';
	import WarningIcon from '#lib/components/icons/WarningIcon.svelte';
	import {simulation} from '#lib/core/contrast.js';
	import type {PaletteColor} from '#lib/core/evaluate.js';
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

	let card = $state<HTMLElement>();
	// the cell that opened the card, to give it focus back
	let invoker: HTMLElement | undefined;

	// Shows the pair, or closes it when it is shown already.
	const handleCell = (
		fg: PaletteColor,
		bg: PaletteColor,
		event: Event
	) => {
		const same =
			open?.fg.id === fg.id && open?.bg.id === bg.id;

		invoker = event.currentTarget as HTMLElement;
		combinations.openPairIds = same
			? null
			: {fg: fg.id, bg: bg.id};
	};

	const handleClose = () => {
		combinations.openPairIds = null;
	};

	// The card is a manual popover anchored to the open cell (CSS
	// anchor), following the open pair: shown and focused when one
	// opens, hidden when it closes or its colors are gone. Manual,
	// as light dismiss would close it on pressing the open cell,
	// which the click would then reopen.
	$effect(() => {
		if (!card) return;

		const isShown = card.matches(':popover-open');

		if (open && !isShown) {
			card.showPopover();
			card.focus();
		} else if (!open && isShown) {
			card.hidePopover();
			invoker?.focus();
		}
	});

	// The open pair is kept in the store, so that leaving the grid
	// and coming back would reopen the card unasked.
	$effect(() => () => {
		combinations.openPairIds = null;
	});

	const previewUid = $derived(
		open ? `${open.bg.id}-${open.fg.id}` : null
	);

	// The brush's metric on the open pair, as is and simulated.
	const lens = $derived.by(() => {
		if (!open) return null;

		const {name, level, simulated} = combinations.brushLevels(
			open.fg,
			open.bg
		);
		const grade = (level: number) =>
			name === 'wcag2'
				? wcag2Grade(level)
				: name === 'apca'
					? `APCA ${wcag3Grade(level)}`
					: null;

		return {
			name,
			rows: [{type: null, level}, ...simulated].map(
				(row) => ({
					...row,
					grade: grade(row.level)
				})
			)
		};
	});

	const requirement = $derived.by(() => {
		const target = combinations.brushTarget;

		return {
			target,
			isSet:
				!!target &&
				open?.check?.pair[target.name] === target.value
		};
	});

	const handlePreview = () => {
		combinations.previewedUid =
			combinations.previewedUid === previewUid
				? null
				: previewUid;
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

<!-- On the window, as focus may be on a cell rather than the card -->
<svelte:window
	onkeydown={(event) => {
		if (open && event.key === 'Escape') handleClose();
	}}
/>

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
			(row), dimmed when it misses the minimum. Activate one
			to open it. {combinations.pairChecks.length} declared.
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
										{@const levels =
											combinations.brushLevels(
												column,
												row
											)}
										{@const passes =
											combinations.passesBrush(
												column,
												row
											)}
										<button
											class="cell pair-cell"
											class:pair-cell--tall={levels
												.simulated.length}
											class:pair-cell--declared={check}
											class:pair-cell--off={check &&
												!check.pass}
											class:pair-cell--dim={!passes}
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
											)}:1{levels.simulated
												.map(
													(s) =>
														`, ${s.type} ${round(s.level, 1)}`
												)
												.join('')}"
											aria-pressed={open?.fg.id ===
												column.id &&
												open?.bg.id === row.id}
											aria-label="{column.name} on {row.name}: {check
												? check.pass
													? 'meets its targets'
													: 'does not meet its targets'
												: 'not declared'}, {passes
												? 'reaches'
												: 'misses'} the minimum{levels.simulated
												.map(
													(s) =>
														`, ${s.type} ${round(s.level, 1)}`
												)
												.join('')}"
											onclick={(event) =>
												handleCell(
													column,
													row,
													event
												)}
										>
											<span
												class="preview"
												aria-hidden="true"
											>
												Aa
												{#if levels.simulated.length}
													<span class="strips">
														{#each levels.simulated as { type } (type)}
															{@const simulate =
																simulation(type)}
															<span
																class="strip"
																style="--cell-bg: {hex(
																	simulate(
																		row.rgbColor
																	)
																)}; --cell-fg: {hex(
																	simulate(
																		column.rgbColor
																	)
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
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div
			bind:this={card}
			class="details elevated"
			popover="manual"
			role="dialog"
			tabindex="-1"
			aria-label="Pair details"
		>
			{#if open}
				<h3 class="h3">{open.fg.name} on {open.bg.name}</h3>

				<p
					class="sample"
					style="background: {hex(
						open.bg.rgbColor
					)}; color: {hex(open.fg.rgbColor)};"
				>
					{open.fg.name}
					<br />
					& {open.bg.name}
				</p>

				{#if lens}
					<h4 class="h3">{labels[lens.name]}</h4>
					<ul>
						{#each lens.rows as { type, level, grade } (type)}
							{@const simulate = type
								? simulation(type)
								: null}
							<li
								class="row lens-row"
								style="background: {hex(
									simulate
										? simulate(open.bg.rgbColor)
										: open.bg.rgbColor
								)}; color: {hex(
									simulate
										? simulate(open.fg.rgbColor)
										: open.fg.rgbColor
								)};"
							>
								<span class="type">
									{type ?? 'normal vision'}
								</span>
								{#if grade}<strong>{grade}</strong>{/if}
								({round(level, 1)})
								{#if requirement.target}
									{#if level >= requirement.target.value}
										<CheckIcon />
										<span class="hidden">met</span>
									{:else}
										<WarningIcon />
										<span class="hidden">not met</span>
									{/if}
								{/if}
							</li>
						{/each}
					</ul>

					<button
						class="button"
						disabled={!requirement.target}
						onclick={() =>
							combinations.toggleBrush(
								open!.fg,
								open!.bg
							)}
					>
						{#if requirement.isSet}
							Remove ≥ {requirement.target?.value} requirement
						{:else}
							Require ≥ {requirement.target?.value ?? '…'}
						{/if}
					</button>
					{#if !requirement.target}
						<p class="hint">
							Set a minimum to require it.
						</p>
					{/if}
				{/if}

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

				<button class="button" onclick={handlePreview}>
					{combinations.previewedUid === previewUid
						? 'Stop preview'
						: 'Preview'}
				</button>

				<button class="button" onclick={handleClose}>
					Close
				</button>
			{/if}
		</div>

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

	.matrix-panel .pair-cell--tall {
		height: 2.75rem;
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

	.sample {
		padding: 1rem;
		border-radius: var(--radius);
		font-size: 1.25rem;
		font-style: italic;
	}

	.lens-row {
		padding: 0.25rem 0.5rem;
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

	/* Next to the open cell where anchors are supported, centered by
	the browser otherwise. */
	.matrix-panel :global(.pair-cell[aria-pressed='true']) {
		anchor-name: --open-pair-cell;
	}

	.matrix-panel .details {
		width: 32ch;
		max-width: calc(100vw - 2rem);
		max-height: calc(100vh - 2rem);
		overflow: auto;
		border: 1px solid var(--fg);
		color: var(--fg);
	}

	@supports (anchor-name: --a) {
		.matrix-panel .details {
			inset: auto;
			margin: 0.5rem;
			position-anchor: --open-pair-cell;
			position-area: block-end span-inline-end;
			position-try-fallbacks:
				flip-block,
				flip-inline,
				flip-block flip-inline;
		}
	}

	/* Dims the colors only, not the marks of a declared pair. */
	.pair-cell--dim .preview {
		opacity: 0.25;
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
