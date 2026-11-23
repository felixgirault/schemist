<script lang="ts">
	import PairMatrix from '#lib/components/combinations/PairMatrix.svelte';
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

<!-- The panel class styles the grid -->
<div class="matrix-panel grid">
	<PairMatrix />
</div>

<style>
	/* The grid scrolls on its own. */
	.grid {
		min-width: 0;
	}
</style>
