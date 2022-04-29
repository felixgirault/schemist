<script lang="ts">
	import {Wcag2Level, Wcag3Level} from '$lib/color/contrast';
	import {
		contrastType,
		minLevel
	} from '$lib/stores/combinations';

	$: entries =
		$contrastType === 'wcag2'
			? [
					['AAA', Wcag2Level.aaa],
					['AA', Wcag2Level.aa],
					[
						'AA18 <span>(large text)</span>',
						Wcag2Level.aa18
					],
					['KO', Wcag2Level.ko]
			  ]
			: [
					['All', Wcag3Level.all],
					['Body text', Wcag3Level.body],
					['Large text', Wcag3Level.large],
					['Text ', Wcag3Level.text],
					['Non text', Wcag3Level.nonText],
					['KO', Wcag3Level.ko]
			  ];
</script>

<fieldset>
	<legend>Minimum contrast level</legend>

	<div class="fieldset-fields">
		<div class="button-list button-list--stacked">
			{#each entries as [label, value] (value)}
				<input
					class="button-trigger hidden"
					id="grade-{value}"
					type="radio"
					bind:group={$minLevel}
					{value}
				/>

				<label
					class="button"
					class:button--active={Number(value) > $minLevel}
					for="grade-{value}"
				>
					{@html label}
					<span>
						{value}+
					</span>
				</label>
			{/each}
		</div>
	</div>
</fieldset>

<style>
	label {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
</style>
