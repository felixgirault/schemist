<script lang="ts">
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import type {RgbColor} from '#lib/color/types.js';
	import CheckIcon from '#lib/components/icons/CheckIcon.svelte';
	import WarningIcon from '#lib/components/icons/WarningIcon.svelte';
	import {simulation} from '#lib/core/contrast.js';
	import type {PairTargets} from '#lib/core/nodes.js';
	import {
		holdsUse,
		targetNames,
		uses
	} from '#lib/core/pairs.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import {round} from '#lib/utils/math.js';
	import './matrix.css';

	const labels = {
		wcag2: 'WCAG 2 contrast',
		apca: 'APCA contrast',
		difference: 'Color difference'
	};

	let open = $derived(combinations.openPair);

	const previewUid = $derived(
		open ? `${open.bg.id}-${open.fg.id}` : null
	);

	const handleClose = () => {
		combinations.openPairIds = null;
	};

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

		palette.setPair(open.fg.id, open.bg.id, targets);
	};

	const ruleOf = (id: string) => {
		const rule = palette.rules.find((r) => r.id === id);

		return rule && combinations.describeRule(rule);
	};

	// Declares the pair with the targets its rules give it, to edit it
	// alone.
	const handleOverride = () => {
		if (open?.check) {
			palette.setPair(
				open.fg.id,
				open.bg.id,
				open.check.pair
			);
		}
	};

	const handleRemove = () => {
		if (open) palette.setPair(open.fg.id, open.bg.id, {});
	};

	// What a declared pair is for.
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
</script>

{#snippet swatch(color: RgbColor)}
	<span class="swatch" style="background: {hex(color)};"></span>
{/snippet}

{#if open}
	<section
		class="details elevated"
		aria-labelledby="pair-card-title"
	>
		<h3 class="h3" id="pair-card-title">
			{open.fg.name} on {open.bg.name}
		</h3>

		<p
			class="sample"
			style="background: {hex(open.bg.rgbColor)}; color: {hex(
				open.fg.rgbColor
			)};"
		>
			{open.fg.name}
			<br />
			& {open.bg.name}
		</p>

		<p>
			{#if open.check}
				For {forNames(open.check)}.
			{:else}
				Not declared.
			{/if}
		</p>

		{#if open.check}
			{@const {sources} = open.check.pair}
			<ul class="sources">
				{#each sources.rules as id (id)}
					{@const rule = ruleOf(id)}
					{#if rule}
						<li>
							{rule.use}, from {rule.label}
						</li>
					{/if}
				{/each}
				{#if sources.oneOff}
					<li>
						one-off{#if sources.overrides.length},
							overrides
							{sources.overrides
								.map((id) => ruleOf(id)?.label)
								.join(', ')}{/if}
					</li>
				{/if}
			</ul>
			{#if sources.rules.length}
				<button class="button" onclick={handleOverride}>
					Override for this pair
				</button>
			{/if}
		{/if}

		<div class="button-list">
			{#each uses as use (use.id)}
				{@const isSet = holdsUse(open.check?.pair, use)}
				<button
					class="button"
					aria-label="{isSet
						? 'Remove'
						: 'Require'} {use.name}"
					onclick={() =>
						combinations.toggleUse(
							open!.fg,
							open!.bg,
							use
						)}
				>
					{isSet ? `${use.name} ✓` : `+ ${use.name}`}
				</button>
			{/each}
		</div>

		<div class="targets">
			{#each targetNames as name (name)}
				<label>
					{labels[name]}
					<input
						type="number"
						min={0}
						step="any"
						value={open.check?.pair[name] ?? ''}
						onchange={(event) => handleTarget(name, event)}
					/>
				</label>
			{/each}
		</div>

		{#if open.check}
			{#each open.check.checks as { target, goal, level, simulated, pass } (target)}
				{@const rows = [{type: null, level}, ...simulated]}
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
							<strong>
								{round(level, 1)}
							</strong>
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

			{#if open.check.pair.sources.oneOff}
				<button class="button" onclick={handleRemove}>
					Remove pair
				</button>
			{/if}
		{:else}
			<p class="hint">Set a target to declare this pair.</p>
		{/if}

		<button class="button" onclick={handlePreview}>
			{combinations.previewedUid === previewUid
				? 'Stop preview'
				: 'Preview'}
		</button>

		<button class="button" onclick={handleClose}>Close</button>
	</section>
{/if}

<style>
	:global(.matrix-panel) .details {
		border: 1px solid var(--fg);
		color: var(--fg);
	}

	.sample {
		padding: 1rem;
		border-radius: var(--radius);
		font-size: 1.25rem;
		font-style: italic;
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
