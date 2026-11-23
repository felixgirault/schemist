<script lang="ts">
	import {
		formatRgbToHex,
		formatSchemist
	} from '#lib/color/formatting.js';
	import AddIcon from '#lib/components/icons/AddIcon.svelte';
	import CheckIcon from '#lib/components/icons/CheckIcon.svelte';
	import CloseIcon from '#lib/components/icons/CloseIcon.svelte';
	import WarningIcon from '#lib/components/icons/WarningIcon.svelte';
	import '#lib/components/palette/tree.css';
	import type {AppRole, AppRule} from '#lib/core/nodes.js';
	import {uses} from '#lib/core/pairs.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import type {PairCheck} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import type {Snippet} from 'svelte';

	interface Props {
		// Draws the pairs under each role and in the one-off groups.
		pairs: Snippet<[PairCheck[]]>;
	}

	let {pairs}: Props = $props();

	// The role a color is being picked for, and the search.
	let picking = $state<string | null>(null);
	let query = $state('');

	// The role a rule is being added to, with the form: the role it is
	// on (an id, `self` or `new`, named in its field) and the use.
	let ruling = $state<string | null>(null);
	let on = $state('self');
	let newOn = $state('');
	let use = $state<string>(uses[0].id);
	let isAddingRole = $state(false);
	let newRole = $state('');
	let error = $state('');

	let byId = $derived(
		new Map(palette.colors.map((color) => [color.id, color]))
	);
	let names = $derived(
		new Map(palette.allColors.map(({id, name}) => [id, name]))
	);

	const outputOf = (id: string) => {
		const color = byId.get(id);

		return color
			? `--output: ${formatRgbToHex(color.rgbColor)};`
			: '';
	};

	const rulesOf = (role: AppRole) =>
		palette.rules.filter(({fg}) => fg === role.id);

	const usedOn = (role: AppRole) =>
		palette.rules.filter(
			({fg, bg}) => bg === role.id && fg !== role.id
		);

	const candidates = (role: AppRole) =>
		palette.colors.filter(
			({id, name}) =>
				!role.colors.includes(id) &&
				name
					.toLowerCase()
					.includes(query.trim().toLowerCase())
		);

	const failing = (rule: AppRule) =>
		(combinations.ruleChecks.get(rule.id) ?? []).some(
			({pass}) => !pass
		);

	const handleRename = (role: AppRole, event: Event) => {
		const input = event.currentTarget as HTMLInputElement;

		if (!palette.renameRole(role.id, input.value)) {
			input.value = role.name;
		}
	};

	const toggleRuling = (role: AppRole) => {
		ruling = ruling === role.id ? null : role.id;
		on = 'self';
		newOn = '';
		error = '';
	};

	const handleAddRule = (role: AppRole, event: SubmitEvent) => {
		event.preventDefault();

		const to =
			on === 'self'
				? undefined
				: on === 'new'
					? palette.addRole(newOn)
					: on;

		if (on === 'new' && !to) {
			error =
				'A new role needs a name that no other role has.';
			return;
		}

		palette.addRule(role.id, to, use);
		ruling = null;
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

{#snippet status(pass: boolean)}
	{#if pass}
		<CheckIcon />
		<span class="hidden">met</span>
	{:else}
		<WarningIcon />
		<span class="hidden">not met</span>
	{/if}
{/snippet}

{#snippet group(
	title: string,
	addLabel: string,
	isOpen: boolean,
	onAdd: () => void,
	children: Snippet
)}
	<article class="tree-node">
		<div class="self">
			<header>
				<div class="title">
					<h4 class="name">{title}</h4>
				</div>
				<div class="button-list">
					<button
						class="button button--icon"
						type="button"
						aria-label={addLabel}
						aria-expanded={isOpen}
						title={addLabel}
						onclick={onAdd}
					>
						<AddIcon />
					</button>
				</div>
			</header>
		</div>
		<div class="children">
			{@render children()}
		</div>
	</article>
{/snippet}

{#snippet roleRow(role: AppRole)}
	{@const rules = rulesOf(role)}
	{@const others = usedOn(role)}
	{@const count = palette.rules.filter(
		({fg, bg}) => fg === role.id || bg === role.id
	).length}
	<article class="tree-node">
		<div class="self">
			<header>
				<div class="title">
					<div class="name">
						<input
							aria-label="Role name"
							value={role.name}
							onchange={(event) =>
								handleRename(role, event)}
						/>
					</div>
					{#if others.length}
						<p class="label">
							used by {others
								.map(
									(rule) =>
										combinations.describeRule(rule)
											.label
								)
								.join(', ')}
						</p>
					{/if}
				</div>

				<div class="button-list">
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
			</header>
		</div>

		<div class="children">
			{#snippet ruleList()}
				{#if ruling === role.id}
					<form
						onsubmit={(event) =>
							handleAddRule(role, event)}
					>
						<label>
							{role.name} on
							<select bind:value={on}>
								{#each palette.roles.filter(({id}) => id !== role.id) as { id, name } (id)}
									<option value={id}>{name}</option>
								{/each}
								<option value="self">
									Among themselves
								</option>
								<option value="new">New role…</option>
							</select>
						</label>
						{#if on === 'new'}
							<label>
								New role name
								<input bind:value={newOn} />
							</label>
						{/if}
						<label>
							For
							<select bind:value={use}>
								{#each uses as { id, name } (id)}
									<option value={id}>{name}</option>
								{/each}
							</select>
						</label>
						{#if error}
							<p role="alert">{error}</p>
						{/if}
						<button class="button" type="submit">
							Add rule
						</button>
					</form>
				{/if}
				{#each rules as rule (rule.id)}
					{@const {use: useName} =
						combinations.describeRule(rule)}
					{@const to = palette.roles.find(
						({id}) => id === rule.bg
					)}
					{@const where = to
						? `on ${to.name}`
						: 'among themselves'}
					{@const checks =
						combinations.ruleChecks.get(rule.id) ?? []}
					<article
						class="tree-node rule"
						onpointerenter={() =>
							(combinations.ruleId = rule.id)}
						onpointerleave={() =>
							(combinations.ruleId = null)}
						onfocusin={() =>
							(combinations.ruleId = rule.id)}
						onfocusout={() => (combinations.ruleId = null)}
					>
						<div class="self">
							<header>
								<div class="title">
									<h5 class="name">
										{where} · {useName}
										{@render status(!failing(rule))}
									</h5>
								</div>
								<div class="button-list">
									<button
										class="button button--icon"
										type="button"
										aria-label="Remove rule {role.name} {where}, {useName}"
										title="Remove this rule"
										onclick={() =>
											palette.removeRule(rule.id)}
									>
										<CloseIcon />
									</button>
								</div>
							</header>
						</div>
						<div class="children">
							{#if !checks.length}
								<p class="hint">
									No pair yet: add colors.
								</p>
							{/if}
							{@render pairs(checks)}
						</div>
					</article>
				{/each}
			{/snippet}

			{#snippet colorList()}
				{#if picking === role.id}
					<div
						role="group"
						aria-label="Colors to add to {role.name}"
					>
						<input
							type="search"
							aria-label="Search colors"
							onkeydown={(event) => {
								if (event.key === 'Escape')
									picking = null;
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
				{#each role.colors as id (id)}
					<article
						class="tree-node"
						class:isHidden={!byId.has(id)}
					>
						<div class="output" style={outputOf(id)}></div>
						<div class="self">
							<header>
								<div class="title">
									<h5 class="name">{names.get(id)}</h5>
								</div>
								<div class="button-list">
									<button
										class="button button--icon"
										type="button"
										aria-label="Remove {names.get(
											id
										)} from {role.name}"
										title="Remove this color from the role"
										onclick={() =>
											palette.removeMember(
												role.id,
												id
											)}
									>
										<CloseIcon />
									</button>
								</div>
							</header>
						</div>
					</article>
				{/each}
			{/snippet}

			{@render group(
				'Rules',
				`Add a rule to ${role.name}`,
				ruling === role.id,
				() => toggleRuling(role),
				ruleList
			)}
			{@render group(
				'Colors',
				`Add a color to ${role.name}`,
				picking === role.id,
				() => {
					picking = picking === role.id ? null : role.id;
					query = '';
				},
				colorList
			)}
		</div>
	</article>
{/snippet}

<section
	class="requirements"
	aria-labelledby="requirements-title"
>
	<h3 class="h3" id="requirements-title">Requirements</h3>

	<div class="roles">
		{#each palette.roles as role (role.id)}
			{@render roleRow(role)}
		{/each}
	</div>

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

	{#if combinations.requirements.length}
		<h4 class="h3">One-off pairs</h4>
		{#each combinations.requirements as { id, name, checks } (id)}
			<h5 class="h3">{name}</h5>
			{@render pairs(checks)}
		{/each}
	{/if}

	{#if combinations.hiddenPairs.length}
		<h4 class="h3">Not checked, a color is hidden</h4>
		<ul>
			{#each combinations.hiddenPairs as { id, fg, bg } (id)}
				<li>{fg} on {bg}</li>
			{/each}
		</ul>
	{/if}

	{#if !palette.rules.length && !combinations.requirements.length && !combinations.hiddenPairs.length}
		<p class="hint">
			Add a rule to see its pairs as they will be used, or
			open a cell and pick a use to declare a pair.
		</p>
	{/if}
</section>

<style>
	.roles {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.name input {
		width: 100%;
		border: 0;
		padding: 0;
		background: transparent;
		font: inherit;
		color: inherit;
	}


	.picker {
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
</style>
