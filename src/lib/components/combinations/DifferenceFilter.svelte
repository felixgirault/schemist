<script lang="ts">
	import {combinations} from '#lib/stores/combinations.svelte.js';
</script>

<fieldset>
	<legend>Minimum difference</legend>

	<div class="fieldset-fields">
		<input
			id="min-difference"
			type="number"
			min={0}
			step={1}
			aria-label="Minimum difference"
			bind:value={combinations.minDifference}
		/>
	</div>
</fieldset>
