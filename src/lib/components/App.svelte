<script lang="ts">
	import Combinations from '#lib/components/combinations/Combinations.svelte';
	import Export from '#lib/components/export/Export.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import Palette from '#lib/components/Palette.svelte';
	import {permalink} from '#lib/routing.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import {history} from '#lib/stores/history.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';

	let isShowingExport = $state(false);
	let shareStatus = $state('');

	// The URL is always up to date, but copying it is handier.
	const handleShare = async () => {
		try {
			await navigator.clipboard.writeText(
				permalink(palette.root)
			);
			shareStatus = 'Link copied';
		} catch {
			shareStatus = 'Copy the link from the address bar';
		}

		setTimeout(() => {
			shareStatus = '';
		}, 2000);
	};

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

		<footer class="form">
			<div class="button-list">
				<button
					class="button"
					title="Export colors in various formats"
					onclick={() => {
						isShowingExport = true;
					}}
				>
					Export
				</button>

				<button
					class="button"
					title="Copy a permalink to this palette"
					onclick={handleShare}
				>
					Share
				</button>

				<button
					class="button"
					title="Undo (Ctrl+Z)"
					disabled={!history.past.length}
					onclick={() => history.undo()}
				>
					Undo
				</button>

				<button
					class="button"
					title="Redo (Ctrl+Shift+Z)"
					disabled={!history.future.length}
					onclick={() => history.redo()}
				>
					Redo
				</button>
			</div>

			<p class="hint" role="status">{shareStatus}</p>
		</footer>
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

		<Combinations />
	</section>
</main>

{#if isShowingExport}
	<Modal
		label="Color values"
		onClose={() => {
			isShowingExport = false;
		}}
	>
		<Export />
	</Modal>
{/if}

<style>
	@media screen and (min-width: 55rem) {
		main {
			display: grid;
			grid-template-columns: 45ch 1fr;
		}
	}

	@media screen and (min-width: 80rem) {
		main {
			grid-template-columns: 50ch 1fr;
		}
	}

	section {
		padding: var(--vgap) var(--hgap);
	}

	h2 span {
		font-size: 1rem;
		font-weight: normal;
	}

	footer {
		margin-top: var(--vgap);
	}
</style>
