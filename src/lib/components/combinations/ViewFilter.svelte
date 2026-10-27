<script lang="ts">
	import {combinations} from '#lib/stores/combinations.svelte.js';
</script>

<fieldset>
	<legend class="hidden">View</legend>

	<div class="button-list">
		<input
			class="button-trigger hidden"
			id="view-grid"
			type="radio"
			value="grid"
			bind:group={combinations.view}
		/>
		<label class="button" for="view-grid">Grid</label>

		<input
			class="button-trigger hidden"
			id="view-list"
			type="radio"
			value="list"
			bind:group={combinations.view}
		/>
		<label class="button" for="view-list">List</label>
	</div>
</fieldset>

<style>
	fieldset {
		margin: 0;
	}
</style>
