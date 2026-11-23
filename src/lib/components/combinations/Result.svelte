<script lang="ts">
	import {wcag2Grade, wcag3Grade} from '#lib/color/contrast.js';
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import PreviewIcon from '#lib/components/icons/PreviewIcon.svelte';
	import type {PairTargets} from '#lib/core/nodes.js';
	import type {TargetCheck} from '#lib/core/pairs.js';
	import {targetNames} from '#lib/core/pairs.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import type {PairCheck} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import {round} from '#lib/utils/math.js';
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
				? `APCA ${wcag3Grade(level)}`
				: 'Difference';

	// A level with its grade, and whether it meets the goal. Normal
	// colors only: simulated levels come back as rows (ADR 20).
	const rowsOf = (
		checks: TargetCheck[],
		levelOf: (check: TargetCheck) => number
	) =>
		checks.map((check) => {
			const level = levelOf(check);

			return {
				name: gradeOf(check.target, level),
				level,
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

	const handlePreview = (uid: string) => {
		combinations.previewedUid =
			combinations.previewedUid === uid ? null : uid;
	};
</script>

{#snippet cell(check: PairCheck | undefined, name: string)}
	{#if check}
		{@const isDifference =
			check.checks.length > 0 &&
			check.checks.every(
				({target}) => target === 'difference'
			)}
		<td
			class="cell"
			class:cell--difference={isDifference}
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
			{#each rowsOf(check.checks, (c) => c.level) as { name, level, met } (name)}
				<span class="level">
					<span class="grade">{name}</span>
					({round(level, 1)})
					<span class="status">
						{met ? 'met' : '✗ not met'}
					</span>
				</span>
			{/each}
			<button
				class="button button--icon"
				title="Preview color combination"
				aria-label="Preview {check.fg.name} on {check.bg
					.name}{name ? ` in ${name}` : ''}"
				onclick={() => handlePreview(check.id)}
			>
				<PreviewIcon />
			</button>
		</td>
	{:else}
		<td class="cell"></td>
	{/if}
{/snippet}

{#snippet cards(checks: PairCheck[])}
	{#if checks.length}
		<div class="scroll">
			<table>
				<thead>
					<tr>
						<th scope="col">
							<span class="hidden">Pair</span>
						</th>
						{#each combinations.allChecks as { name }}
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
				<tbody>
					{#each checks as check (check.id)}
						{@const names = `${check.fg.name} on ${check.bg.name}`}
						<tr>
							<th scope="row">
								{check.fg.name} & {check.bg.name}
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
													value={check.pair[name] ??
														''}
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
										onclick={() => handleRemove(check)}
									>
										Remove pair
									</button>
								{:else if check.pair.sources.rules.length}
									<button
										class="button"
										aria-label="Override {names}"
										title="Declare this pair with the rule's targets, to edit them here"
										onclick={() =>
											handleOverride(check)}
									>
										Override
									</button>
								{/if}
							</th>
							{#each combinations.allChecks as { name, checks: inVariant }}
								{@render cell(
									inVariant.find(
										({id}) => id === check.id
									),
									name
								)}
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{/snippet}

<Requirements pairs={cards} />

<style>
	.targets {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.25rem;
		font-size: 0.8rem;
	}

	.targets input {
		width: 100%;
		color: inherit;
		background: transparent;
		border: 1px solid currentColor;
	}

	.scroll {
		overflow-x: auto;
	}

	table {
		border-collapse: separate;
		border-spacing: 0.5rem;
	}

	th {
		min-width: 12ch;
		text-align: left;
		font-weight: normal;
		vertical-align: top;
	}

	.cell {
		min-width: 16ch;
		padding: 0.75rem;
		vertical-align: top;
		border-radius: var(--radius);
	}

	.cell--difference {
		border: 1px solid currentColor;
	}

	.cell .level {
		display: block;
	}

	.grade {
		font-size: 1.25rem;
		font-weight: 900;
	}

	.status {
		font-size: 0.9rem;
	}

	.swatches {
		display: flex;
		height: 1.5rem;
		margin-bottom: 0.5rem;
		overflow: hidden;
		border-radius: var(--radius);
	}

	.swatches span {
		flex: 1;
	}
</style>
