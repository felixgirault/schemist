<script lang="ts">
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

	const handleInput = ({target}) => {
		const newValue = target.value.trim();
		const [format, color] = parseColor(newValue);

		if (format && color) {
			$colorInputFormat = format;
			value = color;
			target.setCustomValidity('');
		} else {
			target.setCustomValidity('Invalid color');
			target.reportValidity();
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
