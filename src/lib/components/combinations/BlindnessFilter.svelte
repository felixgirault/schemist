<script lang="ts">
	import type {BlindnessType} from '#lib/color/simulation.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';

	const entries: [string, BlindnessType, string][] = [
		['Deutan', 'deuteranomaly', 'Deuteranomaly (red–green)'],
		['Protan', 'protanomaly', 'Protanomaly (red–green)'],
		['Tritan', 'tritanomaly', 'Tritanomaly (blue–yellow)']
	];
</script>

<fieldset>
	<legend class="hidden">
		Color vision deficiency simulation
	</legend>

	<div class="fieldset-fields">
		<div class="button-list">
			{#each entries as [label, type, title] (type)}
				<input
					class="button-trigger hidden"
					id="blindness-{type}"
					type="checkbox"
					bind:group={combinations.blindnessTypes}
					value={type}
				/>

				<label
					class="button"
					for="blindness-{type}"
					title="Simulate {title}"
				>
					{label}
				</label>
			{/each}
		</div>
	</div>
</fieldset>
