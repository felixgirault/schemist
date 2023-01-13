<script lang="ts">
	import type {FormEventHandler} from 'svelte/elements';
	import {
		formatSchemistTo,
		formatSchemistToHex
	} from '$lib/color/formatting';
	import {parseColor} from '$lib/color/parsing';
	import type {SchemistColor} from '$lib/color/types';
	import {colorInputFormat} from '$lib/stores/features';

	const format = (color: SchemistColor) =>
		formatSchemistTo(color, $colorInputFormat, 0);

	export let id: string;
	export let value: SchemistColor;

	let formattedValue = format(value);

	$: formattedValue =
		formatSchemistToHex(value) === formattedValue
			? formattedValue
			: format(value);

	const handleInput: FormEventHandler<HTMLInputElement> = ({
		currentTarget: input
	}) => {
		const newValue = input.value.trim();
		const [format, color] = parseColor(newValue);

		if (format && color) {
			$colorInputFormat = format;
			value = color;
			input.setCustomValidity('');
		} else {
			input.setCustomValidity('Invalid color');
			input.reportValidity();
		}
	};
</script>

<label class="input-grid-firstCol" for="{id}-css">Value</label>
<input
	id="{id}-css"
	class="input-grid-lastCols"
	type="text"
	value={formattedValue}
	on:input={handleInput}
/>
