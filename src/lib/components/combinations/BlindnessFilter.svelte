<script lang="ts">
	import type {BlindnessType} from '#lib/color/simulation.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';

	const entries: [string, BlindnessType, string][] = [
		['Deuteranomaly', 'deuteranomaly', 'red–green'],
		['Protanomaly', 'protanomaly', 'red–green'],
		['Tritanomaly', 'tritanomaly', 'blue–yellow']
	];
</script>

<fieldset>
	<legend>Color vision deficiency simulation</legend>

	<div class="fieldset-fields">
		<div class="button-list">
			{#each entries as [label, type, hint] (type)}
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
					<span>({hint})</span>
				</label>
			{/each}
		</div>
	</div>
</fieldset>
