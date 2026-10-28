<script lang="ts">
	import {Wcag2Level, Wcag3Level} from '#lib/color/contrast.js';
	import {combinations} from '#lib/stores/combinations.svelte.js';

	let entries = $derived(
		combinations.contrastType === 'wcag2'
			? [
					['None', Wcag2Level.ko],
					['AA18', Wcag2Level.aa18, 'large text'],
					['AA', Wcag2Level.aa],
					['AAA', Wcag2Level.aaa]
				]
			: [
					['None', Wcag3Level.ko],
					['Non text', Wcag3Level.nonText],
					['Text ', Wcag3Level.text],
					['Large text', Wcag3Level.large],
					['Body text', Wcag3Level.body],
					['All', Wcag3Level.all]
				]
	);
</script>

<fieldset>
	<legend>Minimum contrast level</legend>

	<div class="fieldset-fields">
		<div class="button-list">
			{#each entries as [label, value, hint] (value)}
				<input
					class="button-trigger hidden"
					id="grade-{value}"
					type="radio"
					bind:group={combinations.minLevel}
					{value}
				/>

				<label
					class="button"
					class:button--active={Number(value) >
						combinations.minLevel}
					for="grade-{value}"
				>
					{@html label}
					<span>
						{value}+

						{#if hint}
							({hint})
						{/if}
					</span>
				</label>
			{/each}
		</div>
	</div>
</fieldset>
