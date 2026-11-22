<script lang="ts">
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import type {RgbColor} from '#lib/color/types.js';
	import type {BlindnessType} from '#lib/core/contrast.js';
	import {simulation} from '#lib/core/contrast.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import type {PairCheck} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import {round} from '#lib/utils/math.js';
	import Requirements from './Requirements.svelte';
	import './matrix.css';

	type Variant = BlindnessType | undefined;

	const targetLabels = {
		wcag2: 'WCAG 2',
		apca: 'APCA',
		difference: 'Difference'
	};

	// As is, then once per selected simulation.
	let variants = $derived<Variant[]>([
		undefined,
		...combinations.blindnessTypes
	]);

	// What each rule is shown as: a role among itself is a set of
	// categories, Large text and UI a stroke and an outline, the rest
	// (Body text, custom) text.
	let sections = $derived(
		palette.rules.map((rule) => ({
			rule,
			...combinations.describeRule(rule),
			kind:
				rule.bg === undefined
					? ('categories' as const)
					: rule.use === 'large'
						? ('large' as const)
						: ('text' as const),
			checks: combinations.ruleChecks.get(rule.id) ?? []
		}))
	);

	const hex = (color: RgbColor, type: Variant) =>
		formatRgbToHex(type ? simulation(type)(color) : color);

	const levelOf = (
		check: PairCheck['checks'][number],
		type: Variant
	) =>
		type
			? (check.simulated.find((s) => s.type === type)
					?.level ?? check.level)
			: check.level;

	const met = (check: PairCheck, type: Variant) =>
		check.checks.every((c) => levelOf(c, type) >= c.goal);

	const levels = (check: PairCheck, type: Variant) =>
		check.checks
			.map(
				(c) =>
					`${targetLabels[c.target]} ${round(levelOf(c, type), 1)} of ${c.goal}`
			)
			.join(', ');

	const surfaces = (checks: PairCheck[]) =>
		[...Map.groupBy(checks, ({bg}) => bg.id).values()].map(
			(group) => ({bg: group[0].bg, checks: group})
		);

	const colorsOf = (checks: PairCheck[]) => [
		...new Map(
			checks.flatMap(({fg, bg}) => [
				[fg.id, fg],
				[bg.id, bg]
			])
		).values()
	];

	const variantName = (type: Variant) =>
		type ?? 'Without simulation';
</script>

{#snippet status(check: PairCheck, type: Variant)}
	<strong>{check.fg.name}</strong>
	on {check.bg.name}:
	{met(check, type) ? 'met' : 'not met'}
	({levels(check, type)})
{/snippet}

{#snippet specimen(
	checks: PairCheck[],
	kind: 'text' | 'large',
	type: Variant
)}
	{#each surfaces(checks) as surface (surface.bg.id)}
		<div class="surface-block">
			<h5 class="surface-name">{surface.bg.name}</h5>
			<div
				class="surface"
				style="background: {hex(surface.bg.rgbColor, type)};"
			>
				{#each surface.checks as check (check.id)}
					{@const fg = hex(check.fg.rgbColor, type)}
					{#if kind === 'text'}
						<p style="color: {fg};">
							<strong>{check.fg.name}:</strong>
							Pack my box with five dozen liquor jugs.
						</p>
					{:else}
						<div class="large" style="color: {fg};">
							<span
								class="stroke"
								style="border-color: {fg};"
							>
								Stroke
							</span>
							<span
								class="outline"
								style="outline-color: {fg};"
							>
								Outline
							</span>
							<span class="large-text">
								{check.fg.name}
							</span>
						</div>
					{/if}
				{/each}
			</div>
			<ul class="statuses">
				{#each surface.checks as check (check.id)}
					<li>{@render status(check, type)}</li>
				{/each}
			</ul>
		</div>
	{/each}
{/snippet}

{#snippet categories(checks: PairCheck[], type: Variant)}
	<ul class="swatches">
		{#each colorsOf(checks) as color (color.id)}
			{@const value = hex(color.rgbColor, type)}
			<li>
				<span
					class="swatch-box"
					style="background: {value};"
				></span>
				<span
					class="bar"
					style="background: {value};"
				></span>
				<span>{color.name}</span>
			</li>
		{/each}
	</ul>
	<ul class="statuses">
		{#each checks as check (check.id)}
			<li>
				<strong>{check.fg.name}</strong>
				and {check.bg.name}:
				{met(check, type) ? 'met' : 'not met'}
				({levels(check, type)})
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet group(
	title: string,
	checks: PairCheck[],
	kind: 'text' | 'large' | 'categories'
)}
	<section class="group">
		<h3 class="h3">{title}</h3>

		{#if !checks.length}
			<p class="hint">No pair yet: add colors.</p>
		{/if}

		{#each checks.length ? variants : [] as type (type ?? 'none')}
			<div class="variant">
				{#if combinations.blindnessTypes.length}
					<h4 class="variant-name">{variantName(type)}</h4>
				{/if}
				{#if kind === 'categories'}
					{@render categories(checks, type)}
				{:else}
					{@render specimen(checks, kind, type)}
				{/if}
			</div>
		{/each}
	</section>
{/snippet}

<div class="matrix-panel">
	<div class="layout">
		<div class="body">
			<div class="results">
				{#each sections as { rule, label, use, kind, checks } (rule.id)}
					{@render group(`${label}, ${use}`, checks, kind)}
				{/each}

				{#if combinations.oneOffChecks.length}
					{@render group(
						'One-off pairs',
						combinations.oneOffChecks,
						'text'
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

	.group,
	.variant {
		display: grid;
		gap: 1rem;
	}

	.variant-name {
		text-transform: capitalize;
	}

	.surface-block {
		display: grid;
		gap: 0.5rem;
	}

	.surface-name {
		font-size: 0.9rem;
	}

	.surface {
		display: grid;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--fg);
		border-radius: var(--radius);
	}

	.surface p {
		margin: 0;
	}

	.statuses {
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.9rem;
	}

	.large {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
	}

	.stroke,
	.outline {
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius);
	}

	.stroke {
		border: 2px solid;
	}

	.outline {
		outline: 3px solid;
		outline-offset: 2px;
	}

	.large-text {
		font-size: 1.5rem;
		font-weight: bold;
	}

	.swatches {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.swatches li {
		display: grid;
		grid-template-columns: 2rem 1fr auto;
		align-items: center;
		gap: 0.5rem;
	}

	.swatch-box {
		width: 2rem;
		height: 2rem;
		border: 1px solid var(--fg);
		border-radius: 50%;
	}

	.bar {
		height: 0.75rem;
		border: 1px solid var(--fg);
		border-radius: 2px;
	}
</style>
