<script lang="ts">
	import {cssColor} from '$lib/color/spaces';
	import Sample from '$lib/components/Sample.svelte';
	import {
		colorFilters,
		sortedColors
	} from '$lib/stores/combinations';
</script>

<fieldset>
	<legend>Colors</legend>

	<div class="fieldset-fields">
		<div class="button-list wrap">
			<!-- Using a keyed each here worsens performances as it causes layout shifts -->
			{#each $sortedColors as { id, name, color }}
				<input
					class="button-trigger hidden"
					id="filter-{id}"
					type="checkbox"
					value={id}
					bind:group={$colorFilters}
				/>

				<label
					class="button button--small"
					for="filter-{id}"
				>
					<Sample color={cssColor(color)} title={name} />
				</label>
			{/each}

			{#if $colorFilters.length}
				<button
					class="button"
					on:click={() => {
						$colorFilters = [];
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
