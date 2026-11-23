<script lang="ts">
	import {wcag2Grade, wcag3Grade} from '#lib/color/contrast.js';
	import Combination from '#lib/components/combinations/Combination.svelte';
	import type {Row} from '#lib/components/combinations/Combination.svelte';
	import {simulation} from '#lib/core/contrast.js';
	import type {TargetCheck} from '#lib/core/pairs.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import type {PairCheck} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import PairCard from './PairCard.svelte';
	import Requirements from './Requirements.svelte';
	import './matrix.css';

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

	// Declares the pair with the targets its rules give it, to edit it
	// alone.
	const handleOverride = (uid: string) => {
		const {fg, bg, pair} = byUid(uid);

		palette.setPair(fg.id, bg.id, pair);
	};

	const handleRemove = (uid: string) => {
		const {fg, bg} = byUid(uid);

		palette.setPair(fg.id, bg.id, {});
	};

	const byUid = (uid: string) =>
		combinations.pairChecks.find(({id}) => id === uid)!;

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
				onOverride={check.pair.sources.rules.length &&
				!check.pair.sources.oneOff
					? handleOverride
					: undefined}
				onRemove={check.pair.sources.oneOff
					? handleRemove
					: undefined}
			/>
		{/each}
	</div>
{/snippet}

<!-- The open cell's card, then each requirement with its cards
underneath -->
<div class="column">
	<PairCard />
	<Requirements pairs={cards} />
</div>

<style>
	.column {
		display: grid;
		gap: 1rem;
		align-content: start;
		min-width: 0;
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
