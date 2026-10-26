<script lang="ts">
	import type {BlindnessType} from '#lib/color/simulation.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';

	const entries: [string, BlindnessType][] = [
		['Protanomaly', 'protanomaly'],
		['Deuteranomaly', 'deuteranomaly'],
		['Tritanomaly', 'tritanomaly']
	];
</script>

<fieldset>
	<legend>Color blindness simulation</legend>

	<div class="fieldset-fields">
		<div class="button-list button-list--stacked">
			{#each entries as [label, type] (type)}
				<input
					class="button-trigger hidden"
					id="blindness-{type}"
					type="checkbox"
					bind:group={combinations.blindnessTypes}
					value={type}
				/>

				<label
					class="button"
					class:button--active={combinations.blindnessTypes.includes(
						type
					)}
					for="blindness-{type}"
				>
					{label}
				</label>
			{/each}
		</div>
	</div>
</fieldset>
