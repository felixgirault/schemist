<script lang="ts">
	import Export from '#lib/components/export/Export.svelte';
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

<aside class="form">
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
</aside>

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
	aside {
		margin-block-start: var(--vgap);
	}
</style>
