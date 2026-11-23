<script lang="ts">
	import {palette} from '#lib/stores/palette.svelte.js';
	import type {EventHandler} from 'svelte/elements';

	const selected = $derived(palette.selectedVariant);
	const base = $derived(palette.variants[0]);

	// A refused name (blank or taken) is put back.
	const handleRename: EventHandler<Event, HTMLInputElement> = ({
		currentTarget
	}) => {
		if (
			!selected ||
			!palette.renameVariant(selected.id, currentTarget.value)
		) {
			currentTarget.value = selected?.name ?? '';
		}
	};
</script>

<div class="switch">
	<div class="button-list" role="group" aria-label="Variants">
		{#each palette.variants as variant (variant.id)}
			<button
				class="button button--small"
				class:button--active={variant.id === selected?.id}
				type="button"
				aria-pressed={variant.id === selected?.id}
				onclick={() => palette.selectVariant(variant.id)}
			>
				{variant.name}
			</button>
		{/each}

		<button
			class="button button--small"
			type="button"
			title="Add a variant, a copy of {base?.name ?? 'Light'}"
			aria-label="Add a variant"
			onclick={() => palette.addVariant()}
		>
			+
		</button>
	</div>

	{#if selected}
		<label class="rename">
			<span class="hint">Name</span>
			<input
				type="text"
				value={selected.name}
				onchange={handleRename}
			/>
		</label>

		<button
			class="button button--small"
			type="button"
			disabled={selected === base}
			title={selected === base
				? 'The base variant can’t be deleted'
				: 'Delete this variant and its overrides'}
			onclick={() => palette.deleteVariant(selected.id)}
		>
			Delete {selected.name}
		</button>
	{/if}
</div>

<style>
	.switch {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
	}

	.rename {
		display: flex;
		align-items: center;
		gap: 0.5ch;
	}

	.rename .hint {
		margin: 0;
	}

	input {
		width: 12ch;
	}
</style>
