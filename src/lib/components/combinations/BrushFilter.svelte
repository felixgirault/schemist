<script lang="ts">
	import {targetNames, uses} from '#lib/core/pairs.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';

	const labels = {
		wcag2: 'Minimum WCAG 2 contrast',
		apca: 'Minimum APCA contrast',
		difference: 'Minimum difference'
	};

	const options = [
		...uses,
		{id: 'custom', name: 'Custom'}
	] as const;

	// Empty means not checked.
	const handleTarget = (
		name: (typeof targetNames)[number],
		event: Event
	) => {
		const {value} = event.currentTarget as HTMLInputElement;
		const level = value.trim() === '' ? NaN : Number(value);

		combinations.custom[name] =
			Number.isFinite(level) && level > 0 ? level : undefined;
	};
</script>

<fieldset>
	<legend>Check</legend>

	<div class="fieldset-fields">
		<div class="button-list">
			{#each options as { id, name } (id)}
				<input
					class="button-trigger hidden"
					id="brush-{id}"
					type="radio"
					name="brush"
					value={id}
					checked={combinations.use === id}
					onchange={() => combinations.setUse(id)}
				/>
				<label class="button" for="brush-{id}">{name}</label>
			{/each}
		</div>

		{#if combinations.use === 'custom'}
			{#each targetNames as name (name)}
				<input
					type="number"
					min={0}
					step="any"
					aria-label={labels[name]}
					placeholder={labels[name]}
					value={combinations.custom[name] ?? ''}
					onchange={(event) => handleTarget(name, event)}
				/>
			{/each}
		{/if}
	</div>
</fieldset>
