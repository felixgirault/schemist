<script lang="ts">
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import AddIcon from '#lib/components/icons/AddIcon.svelte';
	import CheckIcon from '#lib/components/icons/CheckIcon.svelte';
	import CloseIcon from '#lib/components/icons/CloseIcon.svelte';
	import WarningIcon from '#lib/components/icons/WarningIcon.svelte';
	import type {AppRole, AppRule} from '#lib/core/nodes.js';
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

	// The role a color is being picked for, and the search.
	let picking = $state<string | null>(null);
	let query = $state('');

	let isAddingRole = $state(false);
	let newRole = $state('');
	let error = $state('');

	// The one-off pair being added: its colors (ids) and use.
	let isAddingPair = $state(false);
	let pairFg = $state('');
	let pairBg = $state('');
	let pairUse = $state<string>(uses[0].id);
	let pairError = $state('');

	let byId = $derived(
		new Map(palette.colors.map((color) => [color.id, color]))
	);
	let names = $derived(
		new Map(palette.allColors.map(({id, name}) => [id, name]))
	);

	const candidates = (role: AppRole) =>
		palette.colors.filter(
			({id, name}) =>
				!role.colors.includes(id) &&
				name
					.toLowerCase()
					.includes(query.trim().toLowerCase())
		);

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

	const handleRename = (role: AppRole, event: Event) => {
		const input = event.currentTarget as HTMLInputElement;

		if (!palette.renameRole(role.id, input.value)) {
			input.value = role.name;
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

	const handleAddRole = (event: SubmitEvent) => {
		event.preventDefault();

		if (!palette.addRole(newRole)) {
			error = 'A role needs a name that no other role has.';
			return;
		}

		isAddingRole = false;
		newRole = '';
		error = '';
	};
</script>

{#snippet swatch(id: string)}
	{@const color = byId.get(id)}
	{#if color}
		<span
			class="swatch"
			style="background: {formatRgbToHex(color.rgbColor)};"
		></span>
	{/if}
{/snippet}

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

{#snippet roleRow(role: AppRole)}
	{@const count = palette.rules.filter(
		({fg, bg}) => fg === role.id || bg === role.id
	).length}
	<li>
		<div class="role">
			<input
				aria-label="Role name"
				value={role.name}
				onchange={(event) => handleRename(role, event)}
				size={Math.max(role.name.length, 4)}
			/>
			<ul class="chips">
				{#each role.colors as id (id)}
					<li class="chip" class:isHidden={!byId.has(id)}>
						{@render swatch(id)}
						{names.get(id)}
						<button
							class="button button--icon"
							type="button"
							aria-label="Remove {names.get(
								id
							)} from {role.name}"
							title="Remove this color from the role"
							onclick={() =>
								palette.removeMember(role.id, id)}
						>
							<CloseIcon />
						</button>
					</li>
				{/each}
				<li>
					<button
						class="button button--icon"
						type="button"
						aria-label="Add a color to {role.name}"
						aria-expanded={picking === role.id}
						title="Add a color to {role.name}"
						onclick={() => {
							picking =
								picking === role.id ? null : role.id;
							query = '';
						}}
					>
						<AddIcon />
					</button>
				</li>
			</ul>
			<button
				class="button button--icon"
				type="button"
				aria-label="Delete role {role.name}"
				title="Delete this role{count
					? ` and its ${count} rule${count > 1 ? 's' : ''}`
					: ''}"
				onclick={() => palette.deleteRole(role.id)}
			>
				<CloseIcon />
			</button>
		</div>
		{#if picking === role.id}
			<div
				role="group"
				aria-label="Colors to add to {role.name}"
			>
				<input
					type="search"
					aria-label="Search colors"
					onkeydown={(event) => {
						if (event.key === 'Escape') picking = null;
					}}
					placeholder="Search"
					bind:value={query}
				/>
				<ul class="picker">
					{#each candidates(role) as { id, name } (id)}
						<li>
							<button
								class="button"
								onclick={() =>
									palette.addMember(role.id, id)}
							>
								{@render swatch(id)}
								{name}
							</button>
						</li>
					{:else}
						<li class="hint">No other color.</li>
					{/each}
				</ul>
			</div>
		{/if}
	</li>
{/snippet}

<div class="requirements">
	<h3 class="h3">Roles</h3>
	<ul class="roles">
		{#each palette.roles as role (role.id)}
			{@render roleRow(role)}
		{/each}
	</ul>

	{#if isAddingRole}
		<form onsubmit={handleAddRole}>
			<label>
				New role name
				<input bind:value={newRole} />
			</label>
			{#if error}
				<p role="alert">{error}</p>
			{/if}
			<button class="button" type="submit">Add role</button>
		</form>
	{/if}
	<button
		class="button"
		aria-expanded={isAddingRole}
		onclick={() => {
			isAddingRole = !isAddingRole;
			error = '';
		}}
	>
		+ Role
	</button>

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
					{@render swatch(pairFg)}
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
					{@render swatch(pairBg)}
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
			Pick a use in Targets to see pairs as they will be used,
			or declare a one-off pair.
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

	.swatch {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border: 1px solid currentColor;
		border-radius: 50%;
		vertical-align: middle;
	}

	h3 {
		margin-top: 2rem;
		margin-bottom: 0.5rem;
		font-size: 1.6rem;
		line-height: 1.3;
	}

	.scroll {
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

	.roles {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
		padding: 0;
		list-style: none;
	}

	.role {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 1rem;
	}

	.chips {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 1rem;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.chip {
		display: flex;
		align-items: center;
		gap: 0.5ch;
	}

	.chip.isHidden {
		opacity: 0.6;
	}

	.role input {
		border: 0;
		padding: 0;
		background: transparent;
		font: inherit;
		font-weight: bold;
		color: inherit;
	}

	.picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		max-height: 10rem;
		overflow: auto;
		padding: 0;
		list-style: none;
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
