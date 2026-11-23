<script lang="ts">
	import AddIcon from '#lib/components/icons/AddIcon.svelte';
	import CloseIcon from '#lib/components/icons/CloseIcon.svelte';
	import type {AppRole} from '#lib/core/nodes.js';
	import {palette} from '#lib/stores/palette.svelte.js';
	import Swatch from './Swatch.svelte';

	// The role a color is being picked for, and the search.
	let picking = $state<string | null>(null);
	let query = $state('');

	let isAddingRole = $state(false);
	let newRole = $state('');
	let error = $state('');

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

	const handleRename = (role: AppRole, event: Event) => {
		const input = event.currentTarget as HTMLInputElement;

		if (!palette.renameRole(role.id, input.value)) {
			input.value = role.name;
		}
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
						<Swatch {id} />
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
								<Swatch {id} />
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

<section aria-labelledby="roles-title">
	<h2 class="h2" id="roles-title">Roles</h2>
	<ul class="roles">
		{#each palette.roles as role (role.id)}
			{@render roleRow(role)}
		{/each}
	</ul>

	{#if isAddingRole}
		<form onsubmit={handleAddRole}>
			<label>
				New role name
				<input type="text" bind:value={newRole} />
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
</section>

<style>
	section {
		margin-top: var(--vgap);
	}

	h2 {
		margin-bottom: 1rem;
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
</style>
