<script lang="ts">
	import Combinations from '#lib/components/combinations/Combinations.svelte';
	import Export from '#lib/components/export/Export.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import Palette from '#lib/components/Palette.svelte';
	import {permalink} from '#lib/routing.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';
	import {palette} from '#lib/stores/palette.svelte.js';

	let isShowingExport = $state(false);

	const handleShare = () => {
		window.location.assign(permalink(palette.root));
	};
</script>

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
					title="Get a permalink to this palette"
					onclick={handleShare}
				>
					Share
				</button>
			</div>
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
