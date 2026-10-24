<script lang="ts">
	import {formatSchemist} from '#lib/color/formatting.js';
	import Sample from '#lib/components/Sample.svelte';
	import {combinations} from '#lib/stores/combinations.svelte.js';
</script>

<fieldset>
	<legend>Colors</legend>

	<div class="fieldset-fields">
		<div class="button-list wrap">
			<!-- Using a keyed each here worsens performances as it causes layout shifts -->
			{#each combinations.sortedColors as { id, name, color }}
				<input
					class="button-trigger hidden"
					id="filter-{id}"
					type="checkbox"
					value={id}
					bind:group={combinations.colorFilters}
				/>

				<label
					class="button button--small"
					for="filter-{id}"
				>
					<Sample
						color={formatSchemist(color)}
						title={name}
					/>
				</label>
			{/each}

			{#if combinations.colorFilters.length}
				<button
					class="button"
					onclick={() => {
						combinations.colorFilters = [];
					}}
				>
					Reset
				</button>
			{/if}
		</div>
	</div>
</fieldset>

<style>
	label > :global(.sample) {
		width: 1.75rem;
		height: 1.75rem;
	}
</style>
