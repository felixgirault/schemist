<script lang="ts">
	import {combinations} from '#lib/stores/combinations.svelte.js';
</script>

<fieldset>
	<legend>Mode</legend>

	<div class="fieldset-fields">
		<div class="button-list">
			<input
				class="button-trigger hidden"
				id="mode-contrast"
				type="radio"
				value="contrast"
				bind:group={combinations.mode}
			/>
			<label class="button" for="mode-contrast">
				Contrast
			</label>

			<input
				class="button-trigger hidden"
				id="mode-difference"
				type="radio"
				value="difference"
				bind:group={combinations.mode}
			/>
			<label class="button" for="mode-difference">
				Difference
			</label>

			<input
				class="button-trigger hidden"
				id="mode-pairs"
				type="radio"
				value="pairs"
				bind:group={combinations.mode}
			/>
			<label class="button" for="mode-pairs">Grid</label>
		</div>
	</div>
</fieldset>
