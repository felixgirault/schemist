<script lang="ts">
	import {contrastType} from '$lib/stores/combinations';
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
				bind:group={$contrastType}
			/>
			<label class="button" for="wcag2">WCAG 2</label>

			<input
				class="button-trigger hidden"
				id="wcag3"
				type="radio"
				value={'wcag3'}
				bind:group={$contrastType}
			/>
			<label class="button" for="wcag3">
				WCAG 3 <span>(APCA)</span>
			</label>
		</div>
	</div>
</fieldset>
