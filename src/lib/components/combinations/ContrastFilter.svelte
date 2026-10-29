<script lang="ts">
	import {Wcag2Level, Wcag3Level} from '#lib/color/contrast.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';

	let isWcag2 = $derived(combinations.contrastType === 'wcag2');
	let entries: [string, number, string?][] = $derived(
		isWcag2
			? [
					['Any contrast', Wcag2Level.ko],
					['AA18 (large text)', Wcag2Level.aa18],
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

<div>
	<label class="legend" for="min-level">Min. level</label>

	<select
		class="select"
		id="min-level"
		title="Minimum contrast level"
		bind:value={combinations.minLevel}
	>
		{#each entries as [label, value], i (value)}
			<option {value}>
				{label}{i
					? ` (${value}${isWcag2 ? ':1' : ''}+)`
					: ''}
			</option>
		{/each}
	</select>
</div>
