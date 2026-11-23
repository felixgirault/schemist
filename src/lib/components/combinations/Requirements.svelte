<script lang="ts">
	import {formatRgbToHex} from '#lib/color/formatting.js';
	import CheckIcon from '#lib/components/icons/CheckIcon.svelte';
	import WarningIcon from '#lib/components/icons/WarningIcon.svelte';
	import type {AppRole} from '#lib/core/nodes.js';
	import {uses} from '#lib/core/pairs.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import type {PairCheck} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import type {Snippet} from 'svelte';

	interface Props {
		// Draws the pairs under each rule and in the one-off groups.
		pairs: Snippet<[PairCheck[]]>;
	}

	let {pairs}: Props = $props();

	// Rules shown with their roles and failing pairs.
	let expanded = $state<string[]>([]);
	// The role a color is being picked for, and the search.
	let picking = $state<string | null>(null);
	let query = $state('');

	// The new rule: a role id, or `new` (named in its field), or for
	// the second role `self`.
	let fg = $state('');
	let bg = $state('self');
	let use = $state<string>(uses[0].id);
	let newFg = $state('');
	let newBg = $state('');
	let error = $state('');

	let byId = $derived(
		new Map(palette.colors.map((color) => [color.id, color]))
	);
	let names = $derived(
		new Map(palette.allColors.map(({id, name}) => [id, name]))
	);
	let chosenFg = $derived(fg || palette.roles[0]?.id || 'new');

	const toggle = (id: string) => {
		expanded = expanded.includes(id)
			? expanded.filter((e) => e !== id)
			: [...expanded, id];
	};

	const usedBy = (role: AppRole) =>
		palette.rules.filter(
			({fg, bg}) => fg === role.id || bg === role.id
		).length;

	const candidates = (role: AppRole) =>
		palette.colors.filter(
			({id, name}) =>
				!role.colors.includes(id) &&
				name
					.toLowerCase()
					.includes(query.trim().toLowerCase())
		);

	const pick = (role: AppRole, id: string) => {
		palette.addMember(role.id, id);
	};

	const handleRename = (role: AppRole, event: Event) => {
		const input = event.currentTarget as HTMLInputElement;

		if (!palette.renameRole(role.id, input.value)) {
			input.value = role.name;
		}
	};

	// The role of a menu, created when it is `new`.
	const roleOf = (choice: string, name: string) =>
		choice === 'new' ? palette.addRole(name) : choice;

	const handleAdd = (event: SubmitEvent) => {
		event.preventDefault();

		const from = roleOf(chosenFg, newFg);
		const to = bg === 'self' ? undefined : roleOf(bg, newBg);

		// a name taken or empty: nothing was added but the first role
		if (!from || (bg !== 'self' && !to)) {
			error =
				'A new role needs a name that no other role has.';
			if (from && chosenFg === 'new')
				palette.deleteRole(from);
			return;
		}

		error = '';
		const id = palette.addRule(from, to, use);

		expanded = [...expanded, id];
		fg = from;
		bg = to ?? 'self';
		newFg = newBg = '';
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

{#snippet roleEditor(role: AppRole)}
	{@const count = usedBy(role)}
	<div class="role" role="group" aria-label="Role {role.name}">
		<input
			aria-label="Role name"
			value={role.name}
			onchange={(event) => handleRename(role, event)}
		/>
		<ul class="chips">
			{#each role.colors as id (id)}
				<li>
					{@render swatch(id)}
					{names.get(id)}
					<button
						class="button"
						aria-label="Remove {names.get(
							id
						)} from {role.name}"
						onclick={() =>
							palette.removeMember(role.id, id)}
					>
						×
					</button>
				</li>
			{/each}
			<li>
				<button
					class="button"
					aria-label="Add a color to {role.name}"
					aria-expanded={picking === role.id}
					onclick={() => {
						picking = picking === role.id ? null : role.id;
						query = '';
					}}
				>
					+
				</button>
			</li>
		</ul>
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
								onclick={() => pick(role, id)}
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
		{#if count > 1}
			<p class="hint">Used by {count} rules.</p>
		{/if}
		<button
			class="button"
			aria-label="Delete role {role.name}"
			onclick={() => palette.deleteRole(role.id)}
		>
			Delete role{count
				? ` and its ${count} rule${count > 1 ? 's' : ''}`
				: ''}
		</button>
	</div>
{/snippet}

<section
	class="requirements"
	aria-labelledby="requirements-title"
>
	<h3 class="h3" id="requirements-title">Requirements</h3>

	<ul class="rules">
		{#each palette.rules as rule (rule.id)}
			{@const {label, use: useName} =
				combinations.describeRule(rule)}
			{@const checks =
				combinations.ruleChecks.get(rule.id) ?? []}
			{@const failing = checks.filter(({pass}) => !pass)}
			{@const isOpen = expanded.includes(rule.id)}
			{@const from = palette.roles.find(
				(r) => r.id === rule.fg
			)}
			{@const to = palette.roles.find(
				(r) => r.id === rule.bg
			)}
			<li
				class="rule"
				onpointerenter={() =>
					(combinations.ruleId = rule.id)}
				onpointerleave={() => (combinations.ruleId = null)}
				onfocusin={() => (combinations.ruleId = rule.id)}
				onfocusout={() => (combinations.ruleId = null)}
			>
				<div class="head">
					<button
						class="button"
						aria-expanded={isOpen}
						aria-controls="rule-{rule.id}"
						onclick={() => toggle(rule.id)}
					>
						{isOpen ? '▾' : '▸'}
						{label}, {useName}
						{@render status(!failing.length)}
					</button>
					<button
						class="button"
						aria-label="Remove rule {label}, {useName}"
						onclick={() => palette.removeRule(rule.id)}
					>
						×
					</button>
				</div>
				{#if isOpen}
					<div id="rule-{rule.id}">
						{#if from}{@render roleEditor(from)}{/if}
						{#if to && to !== from}{@render roleEditor(
								to
							)}{/if}
						{#if !checks.length}
							<p class="hint">No pair yet: add colors.</p>
						{/if}
					</div>
				{/if}
				{@render pairs(checks)}
			</li>
		{/each}
	</ul>

	<form onsubmit={handleAdd}>
		<h4 class="h3">Add a rule</h4>
		<label>
			Role
			<select
				value={chosenFg}
				onchange={(event) =>
					(fg = event.currentTarget.value)}
			>
				{#each palette.roles as { id, name } (id)}
					<option value={id}>{name}</option>
				{/each}
				<option value="new">New role…</option>
			</select>
		</label>
		{#if chosenFg === 'new'}
			<label>
				New role name
				<input bind:value={newFg} />
			</label>
		{/if}
		<label>
			On
			<select bind:value={bg}>
				{#each palette.roles as { id, name } (id)}
					<option value={id}>{name}</option>
				{/each}
				<option value="self">Among itself</option>
				<option value="new">New role…</option>
			</select>
		</label>
		{#if bg === 'new'}
			<label>
				New role name
				<input bind:value={newBg} />
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
		<button class="button" type="submit">+ Rule</button>
	</form>

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
	.rules,
	.chips,
	.picker {
		padding: 0;
		list-style: none;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.head {
		display: flex;
		gap: 0.25rem;
	}

	.rule {
		margin-bottom: 0.5rem;
	}

	.role {
		margin: 0.5rem 0;
		padding-left: 0.5rem;
		border-left: 2px solid currentColor;
	}

	.picker {
		max-height: 10rem;
		overflow: auto;
	}

	form {
		display: grid;
		gap: 0.5rem;
		margin-block: 1rem;
	}

	label {
		display: grid;
		gap: 0.25rem;
	}
</style>
