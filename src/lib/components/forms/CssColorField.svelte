<script lang="ts">
	import type {Color} from 'culori/fn';
	import {
		convertColor,
		cssColor,
		hexColor,
		isHexColor,
		parseColor,
		schemistColor
	} from '$lib/color/spaces';
	import type {SchemistColor} from '$lib/color/spaces';
	import {colorInputFormat} from '$lib/stores/features';

	const format = (color: Color | string) =>
		$colorInputFormat === 'hex'
			? hexColor(color)
			: cssColor(convertColor(color, $colorInputFormat), 0);

	export let id: string;
	export let value: SchemistColor;

	let inputValue = format(value);

	$: inputValue =
		hexColor(value) === inputValue
			? inputValue
			: format(value);

	const handleInput = ({target}) => {
		const newValue = target.value.trim();
		const isHex = isHexColor(newValue);
		const color = isHex ? newValue : parseColor(newValue);

		if (color) {
			value = schemistColor(color);
			$colorInputFormat = isHex ? 'hex' : color.mode;
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
	value={inputValue}
	on:input={handleInput}
/>
