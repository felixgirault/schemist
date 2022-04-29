<script lang="ts">
	import type {BlindnessType} from '$lib/stores/combinations';
	import {blindnessTypes} from '$lib/stores/combinations';

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
					bind:group={$blindnessTypes}
					value={type}
				/>

				<label
					class="button"
					class:button--active={$blindnessTypes.includes(
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
