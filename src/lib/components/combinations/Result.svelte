<script lang="ts">
	import {wcag2Grade, wcag3Grade} from '#lib/color/contrast.js';
	import Combination from '#lib/components/combinations/Combination.svelte';
	import type {Row} from '#lib/components/combinations/Combination.svelte';
	import {simulation} from '#lib/core/contrast.js';
	import type {PairTargets} from '#lib/core/nodes.js';
	import type {TargetCheck} from '#lib/core/pairs.js';
	import {targetNames} from '#lib/core/pairs.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import type {PairCheck} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
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

	const rowsOf = (
		checks: TargetCheck[],
		levelOf: (check: TargetCheck, index: number) => number
	): Row[] =>
		checks.map((check, i) => {
			const level = levelOf(check, i);

			return {
				name: gradeOf(check.target, level),
				level,
				met: level >= check.goal
			};
		});

	// The simulated colors come with the checks: one per selected
	// simulation, in the same order.
	let simulations = $derived(
		combinations.blindnessTypes.map(
			(type) => [type, simulation(type)] as const
		)
	);

	const simulationsOf = ({fg, bg, checks}: PairCheck) =>
		simulations.map(([type, simulate], i) => ({
			type,
			bg: simulate(bg.rgbColor),
			fg: simulate(fg.rgbColor),
			rows: rowsOf(checks, (c) => c.simulated[i].level)
		}));

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

{#snippet cards(checks: PairCheck[])}
	<div class="cards">
		{#each checks as check (check.id)}
			<Combination
				uid={check.id}
				bgName={check.bg.name}
				fgName={check.fg.name}
				bg={check.bg.rgbColor}
				fg={check.fg.rgbColor}
				rows={rowsOf(check.checks, (c) => c.level)}
				simulations={simulationsOf(check)}
				onPreview={handlePreview}
			>
				{@const names = `${check.fg.name} on ${check.bg.name}`}
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
									value={check.pair[name] ?? ''}
									onchange={(event) =>
										handleTarget(check, name, event)}
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
						onclick={() => handleOverride(check)}
					>
						Override
					</button>
				{/if}
			</Combination>
		{/each}
	</div>
{/snippet}

<Requirements pairs={cards} />

<style>
	.targets {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.25rem;
		font-size: 0.8rem;
	}

	.targets input {
		width: 100%;
		color: inherit;
		background: transparent;
		border: 1px solid currentColor;
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(
			auto-fill,
			minmax(22ch, 1fr)
		);
		gap: 1rem;
	}
</style>
