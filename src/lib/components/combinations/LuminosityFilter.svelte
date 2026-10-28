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
	for="luminosity"
	title="Show colors in grayscale so you can perceive lightness differences between them"
>
	Grayscale
</label>
