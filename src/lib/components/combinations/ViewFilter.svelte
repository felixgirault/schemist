<script lang="ts">
	import GridIcon from '#lib/components/icons/grid.svg?component';
	import ListIcon from '#lib/components/icons/list.svg?component';
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
		<label class="button" for="view-grid">
			<GridIcon />
			Grid
		</label>

		<input
			class="button-trigger hidden"
			id="view-list"
			type="radio"
			value="list"
			bind:group={combinations.view}
		/>
		<label class="button" for="view-list">
			<ListIcon />
			List
		</label>
	</div>
</fieldset>
