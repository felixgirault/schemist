<script lang="ts">
	import {wcag2Grade} from '#lib/color/contrast.js';
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import OptionsIcon from '#lib/components/icons/OptionsIcon.svelte';
	import PreviewIcon from '#lib/components/icons/PreviewIcon.svelte';
	import type {AppRule, PairTargets} from '#lib/core/nodes.js';
	import type {TargetCheck} from '#lib/core/pairs.js';
	import {targetNames} from '#lib/core/pairs.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import type {
		CheckGroup,
		PairCheck
	} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import {round} from '#lib/utils/math.js';
	import type {Snippet} from 'svelte';
	import Requirements from './Requirements.svelte';

	const targetLabels = {
		wcag2: 'WCAG 2',
		apca: 'APCA',
		difference: 'Difference'
	};

	const gradeOf = (
		target: TargetCheck['target'],
		level: number
	) =>
		target === 'wcag2'
			? wcag2Grade(level)
			: target === 'apca'
				? 'Lc'
				: 'Difference';

	// A level with its grade, and whether it meets the goal. APCA
	// rounds down, so that the number never reads as the goal when it
	// is not met. Normal colors only: simulated levels come back as rows (ADR 20).
	const rowsOf = (
		checks: TargetCheck[],
		levelOf: (check: TargetCheck) => number
	) =>
		checks.map((check) => {
			const level = levelOf(check);

			return {
				name: gradeOf(check.target, level),
				shown:
					check.target === 'apca'
						? Math.floor(level)
						: round(level, 1),
				met: level >= check.goal
			};
		});

	// Declares the pair with the targets its rules give it, to edit
	// them on this pair alone.
	const handleOverride = ({fg, bg, pair}: PairCheck) => {
		palette.setPair(fg.id, bg.id, pair);
	};

	const handleRemove = ({fg, bg}: PairCheck) => {
		palette.setPair(fg.id, bg.id, {});
	};

	// Applied on change, so that a half-typed number doesn't remove
	// the pair; clearing every field removes it.
	const handleTarget = (
		{fg, bg, pair}: PairCheck,
		name: (typeof targetNames)[number],
		event: Event
	) => {
		const text = (event.currentTarget as HTMLInputElement)
			.value;
		const value =
			text.trim() === '' ? undefined : Number(text);

		if (value !== undefined && !Number.isFinite(value)) return;

		const targets: PairTargets = {...pair, [name]: value};

		palette.setPair(fg.id, bg.id, targets);
	};

	// Each variant's checks by pair id, so that a cell finds its pair
	// without walking the list.
	let variants = $derived(
		combinations.allChecks.map(({name, checks}) => ({
			name,
			byId: new Map(checks.map((check) => [check.id, check]))
		}))
	);

	const handlePreview = (uid: string) => {
		combinations.previewedUid =
			combinations.previewedUid === uid ? null : uid;
	};
</script>

{#snippet cell(check: PairCheck, name: string)}
	{@const isDifference =
		check.checks.length > 0 &&
		check.checks.every(({target}) => target === 'difference')}
	<td
		class="cell"
		style={isDifference
			? ''
			: `background: ${formatRgbToHex(check.bg.rgbColor)}; color: ${formatRgbToHex(check.fg.rgbColor)};`}
	>
		{#if isDifference}
			<span class="swatches" aria-hidden="true">
				<span
					style="background: {formatRgbToHex(
						check.fg.rgbColor
					)};"
				></span>
				<span
					style="background: {formatRgbToHex(
						check.bg.rgbColor
					)};"
				></span>
			</span>
		{/if}
		{#each rowsOf(check.checks, (c) => c.level) as { name, shown, met }, i (name)}
			{#if i}·{/if}
			<span class="level">
				<span class="grade">{name}</span>
				{shown}
				<span aria-hidden="true">{met ? '✓' : '✗'}</span>
				<span class="hidden">{met ? 'met' : 'not met'}</span>
			</span>
		{/each}
		<!-- Preview shows the selected variant's colors (ADR 20, step 3
				gives each cell its own) -->
		{#if !name || name === palette.selectedVariant?.name}
			<button
				class="button button--icon"
				title="Preview color combination"
				aria-label="Preview {check.fg.name} on {check.bg
					.name}"
				onclick={() => handlePreview(check.id)}
			>
				<PreviewIcon />
			</button>
		{/if}
	</td>
{/snippet}

{#snippet table(
	groups: CheckGroup[],
	status: Snippet<[AppRule[]]>
)}
	{#if groups.length}
		<div class="scroll">
			<table>
				<thead>
					<tr>
						<th scope="col">
							<span class="hidden">Pair</span>
						</th>
						{#each variants as { name }}
							<th scope="col">
								{#if name}{name}{:else}<span
										class="hidden"
									>
										Colors
									</span>{/if}
							</th>
						{/each}
					</tr>
				</thead>
				{#each groups as { id, title, joint, rules, checks } (id)}
					<tbody>
						<tr>
							<th
								class="group"
								scope="rowgroup"
								colspan={variants.length + 1}
							>
								<span class="title">
									{title}
									{@render status(rules)}
								</span>
							</th>
						</tr>
						{#each checks as check (check.id)}
							{@const names = `${check.fg.name} on ${check.bg.name}`}
							<tr>
								<th scope="row">
									{check.fg.name}
									{joint}
									{check.bg.name}
									{#if check.pair.sources.oneOff}
										<div class="targets">
											{#each targetNames as name (name)}
												<label>
													{targetLabels[name]}
													<input
														type="number"
														min={0}
														step="any"
														aria-label="{targetLabels[
															name
														]} target of {names}"
														value={check.pair[
															name
														] ?? ''}
														onchange={(event) =>
															handleTarget(
																check,
																name,
																event
															)}
													/>
												</label>
											{/each}
										</div>
										<button
											class="button"
											aria-label="Remove pair {names}"
											onclick={() =>
												handleRemove(check)}
										>
											Remove pair
										</button>
									{:else if check.pair.sources.rules.length}
										<button
											class="button button--icon"
											aria-label="Override {names}"
											title="Declare this pair with the rule's targets, to edit them here"
											onclick={() =>
												handleOverride(check)}
										>
											<OptionsIcon />
										</button>
									{/if}
								</th>
								{#each variants as { name, byId }}
									{@render cell(
										byId.get(check.id)!,
										name
									)}
								{/each}
							</tr>
						{/each}
					</tbody>
				{/each}
			</table>
		</div>
	{/if}
{/snippet}

<Requirements pairs={table} />

<style>
	.targets {
		display: grid;
		gap: 0.25rem;
		margin-block: 0.25rem;
		font-size: 0.8rem;
	}

	.targets input {
		width: 10ch;
		color: inherit;
		background: transparent;
		border: 1px solid currentColor;
	}

	/* Positioned, to clip the visually hidden texts too */
	.scroll {
		position: relative;
		overflow-x: auto;
	}

	/* Compact rows in the panel's font, not the export table's */
	table {
		width: auto;
		font-family: var(--font-sans);
	}

	th,
	td {
		padding: 0.25rem 0.5rem;
		font-family: inherit;
		font-weight: normal;
		vertical-align: middle;
		white-space: nowrap;
	}

	th[scope='row'] {
		position: sticky;
		left: 0;
		z-index: 1;
		background: var(--bg);
	}

	/* Stays at the left of a table that scrolls sideways */
	.title {
		position: sticky;
		left: 0;
		display: inline-flex;
		gap: 0.5ch;
		align-items: center;
	}

	.group {
		padding-top: 1rem;
		font-weight: bold;
	}

	th .button {
		display: inline-flex;
		vertical-align: middle;
		margin-left: 0.5ch;
		font-size: 0.8rem;
	}

	.grade {
		font-weight: bold;
	}

	/* On the levels' line: icon buttons are flex boxes */
	.cell .button {
		display: inline-flex;
		margin-left: 0.5ch;
		vertical-align: middle;
	}

	.swatches {
		display: inline-flex;
		width: 2rem;
		height: 1rem;
		margin-right: 0.5ch;
		overflow: hidden;
		border-radius: var(--radius);
		vertical-align: middle;
	}

	.swatches span {
		flex: 1;
	}
</style>
