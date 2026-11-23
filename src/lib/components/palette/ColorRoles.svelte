<script lang="ts">
	import RolesIcon from '#lib/components/icons/RolesIcon.svelte';
	import WarningIcon from '#lib/components/icons/WarningIcon.svelte';
	import {palette} from '#lib/stores/palette.svelte.js';

	interface Props {
		// A color of the palette: a node's or a generated one's.
		id: string;
		name: string;
	}

	let {id, name}: Props = $props();

	const popoverId = $derived(`${id}-roles`);
	const given = $derived(
		palette.roles.filter(({colors}) => colors.includes(id))
	);
	// Its roles are lost on reload, as another color has its name.
	const isUnsaved = $derived(
		given.length > 0 && palette.unsavedMembers.includes(name)
	);
	const warning =
		"Another color has this name: its roles won't be saved until one of the colors is renamed.";

	const handleChange = (roleId: string, event: Event) => {
		const {checked} = event.currentTarget as HTMLInputElement;

		if (checked) {
			palette.addMember(roleId, id);
		} else {
			palette.removeMember(roleId, id);
		}
	};
</script>

{#if given.length}
	<span class="given">
		· {given.map(({name}) => name).join(', ')}
	</span>
{/if}

{#if isUnsaved}
	<span class="warning" title={warning}>
		<WarningIcon />
		<span class="hidden">{warning}</span>
	</span>
{/if}

<button
	class="button button--icon"
	type="button"
	title="Roles of {name}"
	aria-label="Roles of {name}"
	popovertarget={popoverId}
>
	<RolesIcon />
</button>

<fieldset id={popoverId} popover class="form">
	<legend>Roles of {name}</legend>
	{#each palette.roles as role (role.id)}
		<label>
			<input
				type="checkbox"
				checked={role.colors.includes(id)}
				onchange={(event) => handleChange(role.id, event)}
			/>
			{role.name}
		</label>
	{:else}
		<p class="hint">No role yet: add one in Targets.</p>
	{/each}
</fieldset>

<style>
	/* Positioned, to hold the visually hidden text */
	.warning {
		position: relative;
	}

	.warning :global(svg) {
		width: 1em;
		height: 1em;
		vertical-align: -0.125em;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.5ch;
	}
</style>
