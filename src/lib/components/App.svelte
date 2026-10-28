<script lang="ts">
	import Combinations from '#lib/components/combinations/Combinations.svelte';
	import Palette from '#lib/components/Palette.svelte';
	import Toolbar from '#lib/components/Toolbar.svelte';
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

<Toolbar />

<!-- svelte-ignore a11y_no_redundant_roles -->
<main role="main">
	<section class="palette">
		<h2 class="hidden">Palette</h2>
		<Palette />
	</section>

	<section class="combinations">
		<h2 class="hidden">Combinations</h2>
		<Combinations />
	</section>
</main>

<style>
	main {
		flex-grow: 1;
	}

	@media screen and (min-width: 55rem) {
		main {
			display: grid;
			grid-template-columns: 45ch minmax(0, 1fr);
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
			grid-template-columns: 50ch minmax(0, 1fr);
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
