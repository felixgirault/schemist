<script lang="ts">
	import Combinations from '#lib/components/combinations/Combinations.svelte';
	import Filters from '#lib/components/combinations/Filters.svelte';
	import Palette from '#lib/components/Palette.svelte';
	import PaletteActions from '#lib/components/PaletteActions.svelte';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import {history} from '#lib/stores/history.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';

	// Leaves native undo to text fields.
	const isEditingText = (target: EventTarget | null) =>
		target instanceof HTMLElement &&
		(target.isContentEditable ||
			target instanceof HTMLTextAreaElement ||
			(target instanceof HTMLInputElement &&
				!['range', 'checkbox', 'radio', 'button'].includes(
					target.type
				)));

	const handleKey = (event: KeyboardEvent) => {
		if (
			!(event.ctrlKey || event.metaKey) ||
			event.key.toLowerCase() !== 'z' ||
			isEditingText(event.target)
		) {
			return;
		}

		event.preventDefault();

		if (event.shiftKey) {
			history.redo();
		} else {
			history.undo();
		}
	};
</script>

<svelte:window onkeydown={handleKey} />

<!-- svelte-ignore a11y_no_redundant_roles -->
<main role="main">
	<section class="palette">
		<header>
			<h2 class="h2">Palette</h2>
		</header>

		<Palette />
		<PaletteActions />
	</section>

	<section class="combinations">
		<header>
			<h2 class="h2">
				Combinations <span>
					({combinations.filtered.length} / {combinations
						.all.length})
				</span>
			</h2>
		</header>

		{#if palette.colors.length > 1}
			<Filters />
		{/if}

		<Combinations />
	</section>
</main>

<style>
	@media screen and (min-width: 55rem) {
		main {
			display: grid;
			grid-template-columns: 45ch minmax(0, 1fr);
		}
	}

	@media screen and (min-width: 80rem) {
		main {
			grid-template-columns: 50ch minmax(0, 1fr);
		}
	}

	section {
		padding: var(--vgap) var(--hgap);
	}

	h2 span {
		font-size: 1rem;
		font-weight: normal;
	}
</style>
