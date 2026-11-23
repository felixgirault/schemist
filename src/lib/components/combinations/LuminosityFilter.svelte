<script lang="ts">
	import {combinations} from '#lib/stores/combinations.svelte.js';
</script>

<input
	class="button-trigger hidden"
	id="luminosity"
	type="checkbox"
	bind:checked={combinations.isLuminosityAnalysisEnabled}
/>

<label
	class="button"
	class:button--active={combinations.isLuminosityAnalysisEnabled}
	for="luminosity"
	title="Show the page in grayscale to perceive lightness differences"
>
	Grayscale
</label>
