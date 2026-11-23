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

{#snippet status(rule: AppRule)}
	{@const {pass, text} = combinations.ruleStatus(rule.id)}
	<span class="status" title={text}>
		{#if pass}
			<CheckIcon />
		{:else}
			<WarningIcon />
		{/if}
		<span class="hidden">{text}</span>
	</span>
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
							size={Math.max(role.name.length, 4)}
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
					<article class="tree-node rule">
						<div class="self">
							<header>
								<div class="title">
									<h5 class="name">
										{where} · {useName}
										{#if checks.length}
											{@render status(rule)}
										{/if}
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
			{/snippet}

			<div class="members">
				<div class="colors">
					<h4 class="name">Colors</h4>
					<ul class="chips">
						{#each role.colors as id (id)}
							<li
								class="chip"
								class:isHidden={!byId.has(id)}
							>
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
										picking === role.id
											? null
											: role.id;
									query = '';
								}}
							>
								<AddIcon />
							</button>
						</li>
					</ul>
				</div>
				{@render colorList()}
			</div>
			{@render group(
				'Rules',
				`Add a rule to ${role.name}`,
				ruling === role.id,
				() => toggleRuling(role),
				ruleList
			)}
		</div>
	</article>
{/snippet}

<div class="requirements">
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

	<h4 class="h3">One-off pairs</h4>
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
	{#each combinations.requirements as { id, name, checks } (id)}
		<h5 class="h3">{name}</h5>
		{@render pairs(checks)}
	{/each}

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
			declare a one-off pair.
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

	.roles {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	/* Actions follow their label, not the panel's right edge */
	.requirements .title {
		flex-grow: 0;
	}

	.colors {
		display: flex;
		align-items: baseline;
		gap: 1ch;
	}

	.chips {
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

	.name input {
		border: 0;
		padding: 0;
		background: transparent;
		font: inherit;
		color: inherit;
	}

	/* As indented as the Rules row, a tree node without preview */
	.members {
		padding-left: 0.75rem;
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
