<script lang="ts">
	import Combinations from '#lib/components/combinations/Combinations.svelte';
	import CombinationsToolbar from '#lib/components/combinations/CombinationsToolbar.svelte';
	import Palette from '#lib/components/Palette.svelte';
	import PaletteToolbar from '#lib/components/palette/PaletteToolbar.svelte';
	import {history} from '#lib/stores/history.svelte.js';

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
	<PaletteToolbar />

	<section class="palette">
		<h2 class="hidden">Palette</h2>
		<Palette />
	</section>

	<CombinationsToolbar />

	<section class="combinations">
		<h2 class="hidden">Combinations</h2>
		<Combinations />
	</section>
</main>

<style>
	main {
		flex-grow: 1;
	}

	/* Filling columns first puts each toolbar above its own
	section, so both toolbars read as a single band on top. */
	@media screen and (min-width: 55rem) {
		main {
			display: grid;
			grid-template-columns: 45ch minmax(0, 1fr);
			grid-template-rows: auto minmax(0, 1fr);
			grid-auto-flow: column;
			min-height: 0;
		}

		section {
			overflow: auto;
			scrollbar-gutter: stable;
		}

		.palette {
			border-right: 1px solid var(--bg-neutral);
		}
	}

	@media screen and (min-width: 80rem) {
		main {
			grid-template-columns: 60ch minmax(0, 1fr);
		}
	}

	section {
		padding: var(--vgap) var(--hgap);
	}

	/* Lets the grid scroll sideways on small screens too */
	.combinations {
		overflow-x: auto;
	}
</style>
