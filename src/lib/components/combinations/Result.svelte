<script lang="ts">
	import {wcag2Grade, wcag3Grade} from '#lib/color/contrast.js';
	import Combination from '#lib/components/combinations/Combination.svelte';
	import type {Row} from '#lib/components/combinations/Combination.svelte';
	import {simulation} from '#lib/core/contrast.js';
	import type {TargetCheck} from '#lib/core/pairs.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import type {PairCheck} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import Requirements from './Requirements.svelte';
	import './matrix.css';

	// One card per pair of each rule.
	let sections = $derived(
		palette.rules.map((rule) => ({
			rule,
			...combinations.describeRule(rule),
			checks: combinations.ruleChecks.get(rule.id) ?? []
		}))
	);

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
			/>
		{/each}
	</div>
{/snippet}

{#snippet group(title: string, checks: PairCheck[])}
	<section class="group">
		<h3 class="h3">{title}</h3>

		{#if !checks.length}
			<p class="hint">No pair yet: add colors.</p>
		{:else}
			{@render cards(checks)}
		{/if}
	</section>
{/snippet}

<div class="matrix-panel">
	<div class="layout">
		<div class="body">
			<div class="results">
				{#each sections as { rule, label, use, checks } (rule.id)}
					{@render group(`${label}, ${use}`, checks)}
				{/each}

				{#if combinations.oneOffChecks.length}
					{@render group(
						'One-off pairs',
						combinations.oneOffChecks
					)}
				{/if}

				{#if !sections.length && !combinations.oneOffChecks.length}
					<p>
						Declare rules or pairs in the requirements to
						see the palette as it will be used.
					</p>
				{/if}
			</div>

			<Requirements />
		</div>
	</div>
</div>

<style>
	.layout {
		container-type: inline-size;
	}

	.body {
		display: grid;
		gap: 1rem;
	}

	.results {
		display: grid;
		gap: 2rem;
		min-width: 0;
	}

	@container (min-width: 48rem) {
		.body {
			grid-template-columns: minmax(0, 1fr) 32ch;
			align-items: start;
		}

		.body :global(.details) {
			position: sticky;
			top: 0;
			max-height: 100vh;
			margin-top: 0;
			overflow: auto;
		}
	}

	.group {
		display: grid;
		gap: 1rem;
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
