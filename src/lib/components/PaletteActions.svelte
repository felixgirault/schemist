<script lang="ts">
	import Export from '#lib/components/export/Export.svelte';
	import RedoIcon from '#lib/components/icons/RedoIcon.svelte';
	import UndoIcon from '#lib/components/icons/UndoIcon.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import {permalink} from '#lib/routing.js';
	import {history} from '#lib/stores/history.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';

	let isShowingExport = $state(false);
	let shareStatus = $state('');

	// The URL is always up to date, but copying it is handier.
	const handleShare = async () => {
		if (!palette.root) {
			return;
		}

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
</script>

<div class="actions">
	<div class="button-list">
		<button
			class="button button--icon"
			title="Undo (Ctrl+Z)"
			aria-label="Undo"
			disabled={!history.past.length}
			onclick={() => history.undo()}
		>
			<UndoIcon />
		</button>

		<button
			class="button button--icon"
			title="Redo (Ctrl+Shift+Z)"
			aria-label="Redo"
			disabled={!history.future.length}
			onclick={() => history.redo()}
		>
			<RedoIcon />
		</button>
	</div>

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
	</div>

	<p class="status" role="status">{shareStatus}</p>
</div>

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
	.actions {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	/* Floats below the toolbar so it doesn't push controls around */
	.status:not(:empty) {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		z-index: 2;
		border-radius: var(--radius--small);
		padding: 0.25rem 0.5rem;
		background: var(--fg);
		color: var(--bg);
		white-space: nowrap;
		animation: var(--animation-slide-up);
	}
</style>
