<script lang="ts">
	import {combinations} from '#lib/stores/combinations.svelte.js';
</script>

<fieldset>
	<legend>View</legend>

	<div class="fieldset-fields">
		<div class="button-list">
			<input
				class="button-trigger hidden"
				id="view-list"
				type="radio"
				value="list"
				bind:group={combinations.view}
			/>
			<label class="button" for="view-list">List</label>

			<input
				class="button-trigger hidden"
				id="view-grid"
				type="radio"
				value="grid"
				bind:group={combinations.view}
			/>
			<label class="button" for="view-grid">Grid</label>
		</div>
	</div>
</fieldset>
