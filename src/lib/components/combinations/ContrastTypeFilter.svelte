<script lang="ts">
	import {combinations} from '#lib/stores/combinations.svelte.js';
</script>

<fieldset>
	<legend>Contrast type</legend>

	<div class="fieldset-fields">
		<div class="button-list">
			<input
				class="button-trigger hidden"
				id="wcag2"
				type="radio"
				value="wcag2"
				bind:group={combinations.contrastType}
			/>
			<label class="button" for="wcag2">WCAG 2</label>

			<input
				class="button-trigger hidden"
				id="wcag3"
				type="radio"
				value={'wcag3'}
				bind:group={combinations.contrastType}
			/>
			<label class="button" for="wcag3">
				WCAG 3 <span>(APCA)</span>
			</label>
		</div>
	</div>
</fieldset>
