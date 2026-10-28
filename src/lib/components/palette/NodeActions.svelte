<script lang="ts">
	import AddIcon from '#lib/components/icons/add.svg?component';
	import CloseIcon from '#lib/components/icons/close.svg?component';
	import ExpandIcon from '#lib/components/icons/expand.svg?component';
	import OptionsIcon from '#lib/components/icons/options.svg?component';
	import SwapIcon from '#lib/components/icons/swap.svg?component';
	import InfoIcon from '#lib/components/icons/info.svg?component';
	import OffIcon from '#lib/components/icons/off.svg?component';
	import OnIcon from '#lib/components/icons/on.svg?component';

	interface Props {
		infoId: string;
		optionsId: string;
		isHiddenId: string;
		isRemovable: boolean;
		isSwappable: boolean;
		// Presets can be expanded, but can't have children.
		isPreset: boolean;
		isHidden: boolean;
		hasOptions: boolean;
		hasHint: boolean;
		onPick: () => void;
		onSwap: () => void;
		onExpand: () => void;
		onRemove: () => void;
	}

	let {
		infoId,
		optionsId,
		isHiddenId,
		isRemovable,
		isSwappable,
		isPreset,
		isHidden = $bindable(),
		hasOptions,
		hasHint,
		onPick,
		onSwap,
		onExpand,
		onRemove
	}: Props = $props();

	const SvelteComponent = $derived(isHidden ? OffIcon : OnIcon);
</script>

<div class="button-list">
	<button
		class="button button--icon"
		type="button"
		title="Remove this color and all of its derivatives"
		disabled={!isRemovable}
		onclick={onRemove}
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
		<SvelteComponent />
	</label>

	<button
		class="button button--icon"
		type="button"
		title="Show color info"
		popovertarget={infoId}
	>
		<InfoIcon />
	</button>

	<button
		class="button button--icon"
		type="button"
		title="Tune this color"
		popovertarget={optionsId}
		disabled={!hasOptions}
	>
		<OptionsIcon />
	</button>

	{#if isPreset}
		<button
			class="button button--icon"
			type="button"
			title="Turn into separate colors"
			disabled={!isRemovable}
			onclick={onExpand}
		>
			<ExpandIcon />
		</button>
	{:else}
		<button
			class="button button--icon"
			type="button"
			title="Change this color's type"
			disabled={!isSwappable}
			onclick={onSwap}
		>
			<SwapIcon />
		</button>
	{/if}

	<button
		class="button button--icon button--hint"
		type="button"
		title="Add matching colors"
		disabled={isPreset}
		onclick={onPick}
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

	/* Below the button, as the palette clips what overflows its top */
	.hint {
		position: absolute;
		top: 2.5rem;
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
		top: -0.75rem;
		right: var(--radius);
		content: '';
		display: block;
		height: 0;
		width: 0;
		border-left: 0.75rem solid transparent;
		border-right: 0.75rem solid transparent;
		border-bottom: 1rem solid var(--fg);
	}
</style>
