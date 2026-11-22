<script lang="ts">
	import {combinations} from '#lib/stores/combinations.svelte.js';
</script>

<fieldset>
	<legend>Check</legend>

	<div class="fieldset-fields">
		<div class="button-list">
			<input
				class="button-trigger hidden"
				id="brush-contrast"
				type="radio"
				value="contrast"
				bind:group={combinations.brush}
			/>
			<label class="button" for="brush-contrast">
				Contrast
			</label>

			<input
				class="button-trigger hidden"
				id="brush-difference"
				type="radio"
				value="difference"
				bind:group={combinations.brush}
			/>
			<label class="button" for="brush-difference">
				Difference
			</label>
		</div>
	</div>
</fieldset>
