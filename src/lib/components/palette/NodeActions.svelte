<script lang="ts">
	import AddIcon from '$lib/components/icons/AddIcon.svelte';
	import CloseIcon from '$lib/components/icons/CloseIcon.svelte';
	import OptionsIcon from '$lib/components/icons/OptionsIcon.svelte';
	import InfoIcon from '../icons/InfoIcon.svelte';
	import OffIcon from '../icons/OffIcon.svelte';
	import OnIcon from '../icons/OnIcon.svelte';

	export let infoId: string;
	export let optionsId: string;
	export let isHiddenId: string;
	export let isRemovable: boolean;
	export let isHidden: boolean;
	export let isInfoOpen: boolean;
	export let areOptionsOpen: boolean;
	export let hasOptions: boolean;
	export let hasHint: boolean;
	export let onPick: () => void;
	export let onRemove: () => void;
</script>

<div class="button-list">
	<button
		class="button button--icon"
		type="button"
		title="Remove this color and all of its derivatives"
		disabled={!isRemovable}
		on:click={onRemove}
	>
		<CloseIcon />
	</button>

	<input
		class="button-trigger hidden"
		id={isHiddenId}
		type="checkbox"
		value="1"
		bind:checked={isHidden}
	/>

	<label
		class="button button--icon"
		for={isHiddenId}
		title="Don't compare this color"
	>
		<svelte:component this={isHidden ? OffIcon : OnIcon} />
	</label>

	<button
		class="button button--icon"
		type="button"
		title="Show color info"
		aria-controls={infoId}
		aria-expanded={isInfoOpen}
		on:click={() => {
			isInfoOpen = !isInfoOpen;
		}}
	>
		<InfoIcon />
	</button>

	<button
		class="button button--icon"
		type="button"
		title="Tune this color"
		aria-controls={optionsId}
		aria-expanded={areOptionsOpen}
		disabled={!hasOptions}
		on:click={() => {
			areOptionsOpen = !areOptionsOpen;
		}}
	>
		<OptionsIcon />
	</button>

	<button
		class="button button--icon button--hint"
		type="button"
		title="Add matching colors"
		on:click={onPick}
	>
		<AddIcon />

		{#if hasHint}
			<span class="hint" id="hint">
				Start by adding matching colors
			</span>
		{/if}
	</button>
</div>

<style>
	.button[disabled] {
		visibility: hidden;
	}

	.button--hint {
		position: relative;
	}

	.hint {
		position: absolute;
		bottom: 2rem;
		right: calc(-1 * var(--radius));
		border-radius: var(--radius);
		padding: 0.5rem;
		min-width: 15ch;
		background: var(--fg);
		color: var(--bg);
		z-index: 10;
		animation: slide-down 500ms ease-out;
	}

	.hint:after {
		position: absolute;
		bottom: -0.75rem;
		right: var(--radius);
		content: '';
		display: block;
		height: 0;
		width: 0;
		border-left: 0.75rem solid transparent;
		border-right: 0.75rem solid transparent;
		border-top: 1rem solid var(--fg);
	}
</style>
