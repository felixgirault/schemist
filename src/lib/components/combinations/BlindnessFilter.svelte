<script lang="ts">
	import type {BlindnessType} from '#lib/color/simulation.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';

	const entries: [string, BlindnessType, string][] = [
		['Deut.', 'deuteranomaly', 'Deuteranomaly (red–green)'],
		['Prot.', 'protanomaly', 'Protanomaly (red–green)'],
		['Trit.', 'tritanomaly', 'Tritanomaly (blue–yellow)']
	];
</script>

<fieldset>
	<legend>
		<abbr title="Color Vision Deficiency">CVD</abbr>
		simulation
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

				<label class="button" for="blindness-{type}" {title}>
					{label}
				</label>
			{/each}
		</div>
	</div>
</fieldset>
