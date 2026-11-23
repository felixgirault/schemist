<script lang="ts">
	import type {BlindnessType} from '#lib/core/contrast.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';

	const entries: [string, string, BlindnessType][] = [
		['P', 'Protanomaly', 'protanomaly'],
		['D', 'Deuteranomaly', 'deuteranomaly'],
		['T', 'Tritanomaly', 'tritanomaly']
	];
</script>

<div class="button-list" role="group" aria-label="Simulate">
	<span>Simulate</span>
	{#each entries as [short, label, type] (type)}
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
			title={label}
		>
			{short}
			<span class="hidden">{label}</span>
		</label>
	{/each}
</div>
