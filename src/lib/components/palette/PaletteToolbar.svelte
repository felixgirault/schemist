<script lang="ts">
	import Export from '#lib/components/export/Export.svelte';
	import ExportIcon from '#lib/components/icons/export.svg?component';
	import RedoIcon from '#lib/components/icons/redo.svg?component';
	import ShareIcon from '#lib/components/icons/share.svg?component';
	import UndoIcon from '#lib/components/icons/undo.svg?component';
	import Modal from '#lib/components/Modal.svelte';
	import Toolbar from '#lib/components/Toolbar.svelte';
	import {permalink} from '#lib/routing.js';
	import {history} from '#lib/stores/history.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';

	let isShowingExport = $state(false);

	// The URL is always up to date, but copying it is handier.
	const handleShare = async () => {
		if (!palette.root) {
			return;
		}

		try {
			await navigator.clipboard.writeText(
				permalink(palette.root)
			);

			alert('Link copied');
		} catch {
			alert('Copy the link from the address bar');
		}
	};
</script>

<Toolbar>
	<header class="brand">
		<h1>Schemist</h1>
		<p>Cohesive & accessible</p>
	</header>

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
			<ExportIcon />
		</button>

		<button
			class="button"
			title="Copy a permalink to this palette"
			onclick={handleShare}
		>
			<ShareIcon />
		</button>
	</div>
</Toolbar>

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
	header {
		margin-inline-end: auto;
	}

	h1 {
		font-size: 2rem;
		font-weight: 900;
		line-height: 1;
	}
</style>
