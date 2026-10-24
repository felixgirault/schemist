<script lang="ts">
	import {combinations} from '#lib/stores/combinations.svelte.js';
</script>

<fieldset>
	<legend>Luminosity analysis</legend>

	<div class="fieldset-fields">
		<p class="hint">
			Show colors in grayscale so you can perceive lightness
			differences between them.
		</p>

		<input
			class="button-trigger hidden"
			id="luminosity"
			type="checkbox"
			value={true}
			bind:checked={combinations.isLuminosityAnalysisEnabled}
		/>

		<label class="button" for="luminosity">
			{combinations.isLuminosityAnalysisEnabled
				? 'On'
				: 'Off'}
		</label>
	</div>
</fieldset>
