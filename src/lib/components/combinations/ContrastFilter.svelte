<script lang="ts">
	import {Wcag2Level, Wcag3Level} from '#lib/color/contrast.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';

	let entries: [string, number, string?][] = $derived(
		combinations.contrastType === 'wcag2'
			? [
					['Any contrast', Wcag2Level.ko],
					['AA18', Wcag2Level.aa18, 'large text'],
					['AA', Wcag2Level.aa],
					['AAA', Wcag2Level.aaa]
				]
			: [
					['Any contrast', Wcag3Level.ko],
					['Non text', Wcag3Level.nonText],
					['Text', Wcag3Level.text],
					['Large text', Wcag3Level.large],
					['Body text', Wcag3Level.body],
					['All', Wcag3Level.all]
				]
	);
</script>

<label class="hidden" for="min-level">
	Minimum contrast level
</label>

<select
	class="select"
	id="min-level"
	title="Minimum contrast level"
	bind:value={combinations.minLevel}
>
	{#each entries as [label, value, hint], i (value)}
		<option {value} title={hint}>
			{label}{i ? ` (${value}+)` : ''}
		</option>
	{/each}
</select>
