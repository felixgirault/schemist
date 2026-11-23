<script lang="ts">
	import PairMatrix from '#lib/components/combinations/PairMatrix.svelte';
	import Result from '#lib/components/combinations/Result.svelte';
	import {combinations} from '#lib/stores/combinations.svelte.js';

	// The open pair and the hovered rule are kept in the store, so
	// that leaving the page and coming back would restore them.
	$effect(() => () => {
		combinations.openPairIds = null;
		combinations.ruleId = null;
	});
</script>

<!-- On the window, as focus may be on a cell rather than the card -->
<svelte:window
	onkeydown={(event) => {
		if (combinations.openPair && event.key === 'Escape') {
			combinations.openPairIds = null;
		}
	}}
/>

<!-- The panel class styles the grid, the card and the role chips -->
<div class="matrix-panel layout">
	<div class="body">
		<div class="grid">
			<PairMatrix />
		</div>
		<Result />
	</div>
</div>

<style>
	.layout {
		container-type: inline-size;
	}

	.body {
		display: grid;
		gap: 1rem;
	}

	/* The grid scrolls on its own. */
	.grid {
		min-width: 0;
	}

	@container (min-width: 48rem) {
		.body {
			grid-template-columns: minmax(0, 1fr) 32ch;
			align-items: start;
		}
	}
</style>
