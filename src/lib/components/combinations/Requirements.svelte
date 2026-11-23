<script lang="ts">
	import CheckIcon from '#lib/components/icons/CheckIcon.svelte';
	import WarningIcon from '#lib/components/icons/WarningIcon.svelte';
	import Swatch from '#lib/components/palette/Swatch.svelte';
	import type {AppRule} from '#lib/core/nodes.js';
	import {targetNames, uses} from '#lib/core/pairs.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import type {CheckGroup} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import type {Snippet} from 'svelte';

	interface Props {
		// Draws the pairs of every group, as one table.
		pairs: Snippet<[CheckGroup[], Snippet<[AppRule[]]>]>;
	}

	let {pairs}: Props = $props();

	// The one-off pair being added: its colors (ids) and use.
	let isAddingPair = $state(false);
	let pairFg = $state('');
	let pairBg = $state('');
	let pairUse = $state<string>(uses[0].id);
	let pairError = $state('');

	// What a cell shows: the rules of its couple, on the diagonal a
	// missing `bg` or the same as `fg`.
	const cellRules = (fg: string, bg: string) =>
		palette.rules.filter(
			(rule) =>
				rule.fg === fg &&
				(fg === bg
					? !rule.bg || rule.bg === fg
					: rule.bg === bg)
		);

	// A rule a use alone describes, with no targets of its own.
	const plainUse = (rule: AppRule) =>
		targetNames.some((name) => rule[name] !== undefined)
			? undefined
			: uses.find(({id}) => id === rule.use);

	const valueOf = (rules: AppRule[]) =>
		!rules.length
			? ''
			: rules.length === 1 && plainUse(rules[0])
				? rules[0].use!
				: 'custom';

	// The extra option of a cell the selects can't offer.
	const labelOf = (rules: AppRule[]) =>
		[
			...new Set(
				rules.map((rule) => plainUse(rule)?.name ?? 'Custom')
			)
		].join(' + ');

	// Every rule in the grid's order: rows, then columns.
	let gridRules = $derived(
		palette.roles.flatMap((row) =>
			palette.roles.flatMap((col) =>
				cellRules(row.id, col.id)
			)
		)
	);

	// The groups with checked pairs: a cell's rules in the grid's
	// order, each pair once, then the one-off pairs by use.
	let groups = $derived(
		[
			...palette.roles.flatMap((row) =>
				palette.roles.flatMap((col): CheckGroup[] => {
					const rules = cellRules(row.id, col.id);

					if (!rules.length) return [];

					return [
						{
							id: `${row.id}-${col.id}`,
							title: `${combinations.describeRule(rules[0]).label} · ${labelOf(rules)}`,
							rules,
							checks: [
								...new Map(
									rules
										.flatMap(
											({id}) =>
												combinations.ruleChecks.get(
													id
												) ?? []
										)
										.map((check) => [check.id, check])
								).values()
							]
						}
					];
				})
			),
			...combinations.requirements.map(
				({id, name, checks}): CheckGroup => ({
					id,
					title: `One-off pairs · ${name}`,
					rules: [],
					checks
				})
			)
		].filter(({checks}) => checks.length)
	);

	const handleUse = (fg: string, bg: string, event: Event) => {
		const {value} = event.currentTarget as HTMLSelectElement;

		if (value !== 'custom') {
			palette.setRule(fg, bg, value || undefined);
		}
	};

	const toggleAddingPair = () => {
		isAddingPair = !isAddingPair;
		pairFg = palette.colors[0]?.id ?? '';
		pairBg = palette.colors[1]?.id ?? '';
		pairError = '';
	};

	const handleAddPair = (event: SubmitEvent) => {
		event.preventDefault();

		const use = uses.find(({id}) => id === pairUse)!;

		if (!combinations.addPair(pairFg, pairBg, use)) {
			pairError = 'A pair needs two different colors.';
			return;
		}

		isAddingPair = false;
	};
</script>

{#snippet status(rules: AppRule[])}
	{@const all = rules
		.filter(({id}) => combinations.ruleChecks.get(id)?.length)
		.map(({id}) => combinations.ruleStatus(id))}
	{@const text = all.every(({pass}) => pass)
		? 'met'
		: [
				...new Set(
					all.filter(({pass}) => !pass).map((s) => s.text)
				)
			].join(', ')}
	{#if all.length}
		<span class="status" title={text}>
			{#if text === 'met'}
				<CheckIcon />
			{:else}
				<WarningIcon />
			{/if}
			<span class="hidden">{text}</span>
		</span>
	{/if}
{/snippet}

<div class="requirements">
	{#if palette.roles.length}
		<h3 class="h3">Targets</h3>
		<div class="scroll">
			<table class="targets">
				<thead>
					<tr>
						<td></td>
						{#each palette.roles as col (col.id)}
							<th scope="col">on {col.name}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each palette.roles as row (row.id)}
						<tr>
							<th scope="row">{row.name}</th>
							{#each palette.roles as col (col.id)}
								{@const rules = cellRules(
									row.id,
									col.id
								)}
								{@const value = valueOf(rules)}
								<td>
									<select
										class:empty={!value}
										aria-label={row.id === col.id
											? `${row.name} among themselves`
											: `${row.name} on ${col.name}`}
										{value}
										onchange={(event) =>
											handleUse(
												row.id,
												col.id,
												event
											)}
									>
										<option value="">—</option>
										{#each uses as { id, name } (id)}
											<option value={id}>
												{name}
											</option>
										{/each}
										{#if value === 'custom'}
											<option value="custom">
												{labelOf(rules)}
											</option>
										{/if}
									</select>
									{@render status(rules)}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if groups.length || palette.rules.length}
		<h3 class="h3">Checks</h3>
		{@render pairs(groups, status)}
		{#if gridRules.some(({id}) => !combinations.ruleChecks.get(id)?.length)}
			<p class="hint">
				A rule is checked once its roles have colors.
			</p>
		{/if}
	{/if}

	<h3 class="h3">One-off pairs</h3>
	{#if isAddingPair}
		<form onsubmit={handleAddPair}>
			<label>
				Foreground
				<span class="pick">
					<Swatch id={pairFg} />
					<select bind:value={pairFg}>
						{#each palette.colors as { id, name } (id)}
							<option value={id}>{name}</option>
						{/each}
					</select>
				</span>
			</label>
			<label>
				Background
				<span class="pick">
					<Swatch id={pairBg} />
					<select bind:value={pairBg}>
						{#each palette.colors as { id, name } (id)}
							<option value={id}>{name}</option>
						{/each}
					</select>
				</span>
			</label>
			<label>
				For
				<select bind:value={pairUse}>
					{#each uses as { id, name } (id)}
						<option value={id}>{name}</option>
					{/each}
				</select>
			</label>
			{#if pairError}
				<p role="alert">{pairError}</p>
			{/if}
			<button class="button" type="submit">Add pair</button>
		</form>
	{/if}
	<button
		class="button"
		aria-expanded={isAddingPair}
		onclick={toggleAddingPair}
	>
		+ Pair
	</button>

	{#if combinations.hiddenPairs.length}
		<h3 class="h3">Not checked, a color is hidden</h3>
		<ul>
			{#each combinations.hiddenPairs as { id, fg, bg } (id)}
				<li>{fg} on {bg}</li>
			{/each}
		</ul>
	{/if}

	{#if !palette.rules.length && !combinations.requirements.length && !combinations.hiddenPairs.length}
		<p class="hint">
			Give colors a role and pick a use in Targets to see
			pairs as they will be used, or declare a one-off pair.
		</p>
	{/if}
</div>

<style>
	/* As tall as the text it follows */
	.status :global(svg) {
		width: 1em;
		height: 1em;
		vertical-align: -0.125em;
	}

	h3 {
		margin-top: 2rem;
		margin-bottom: 0.5rem;
		font-size: 1.6rem;
		line-height: 1.3;
	}

	/* Positioned, to clip the visually hidden texts too */
	.scroll {
		position: relative;
		overflow-x: auto;
	}

	/* In the panel's font, not the export table's; compact */
	.targets {
		width: auto;
		font-family: var(--font-sans);
	}

	.targets th,
	.targets td {
		padding: 0.25rem;
		font-family: inherit;
		white-space: nowrap;
	}

	.targets th[scope='row'] {
		position: sticky;
		left: 0;
		z-index: 1;
		padding-right: 0.5rem;
		background: var(--bg);
	}

	/* Wide enough for any use, not for several */
	.targets select {
		max-width: 9.5rem;
		font-size: 0.85rem;
	}

	.targets select.empty {
		width: 100%;
		min-width: 4.5rem;
	}

	/* Faded, not hidden: still 4.5:1 against the field */
	.targets select.empty:not(:hover, :focus-visible) {
		color: color-mix(in srgb, var(--fg) 70%, var(--bg-hard));
		box-shadow: inset 0 0 0 1px var(--bg-neutral);
	}

	form {
		display: grid;
		gap: 0.5rem;
		margin-block: 0.5rem;
	}

	label {
		display: grid;
		gap: 0.25rem;
	}

	.pick {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
