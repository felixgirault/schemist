<script lang="ts">
	import RolesIcon from '#lib/components/icons/RolesIcon.svelte';
	import {palette} from '#lib/stores/palette.svelte.js';

	interface Props {
		// A color of the palette: a node's or a generated one's.
		id: string;
		name: string;
	}

	let {id, name}: Props = $props();

	const popoverId = $derived(`${id}-roles`);

	const handleChange = (roleId: string, event: Event) => {
		const {checked} = event.currentTarget as HTMLInputElement;

		if (checked) {
			palette.addMember(roleId, id);
		} else {
			palette.removeMember(roleId, id);
		}
	};
</script>

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
	/* Floated, as a legend is otherwise drawn over the border */
	legend {
		float: left;
		width: 100%;
	}

	label,
	.hint {
		clear: both;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.5ch;
	}
</style>
