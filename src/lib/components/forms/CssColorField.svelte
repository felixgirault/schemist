<script lang="ts">
	import {
		formatSchemistTo,
		formatSchemistToHex
	} from '#lib/color/formatting.js';
	import {parseColor} from '#lib/color/parsing.js';
	import type {SchemistColor} from '#lib/color/types.js';
	import {features} from '#lib/stores/features.svelte.js';
	import type {FormEventHandler} from 'svelte/elements';

	const format = (color: SchemistColor) =>
		formatSchemistTo(color, features.colorInputFormat, 0);

	interface Props {
		id: string;
		value: SchemistColor;
	}

	let {id, value = $bindable()}: Props = $props();

	let lastFormattedValue = '';
	const formattedValue = $derived(
		(lastFormattedValue =
			formatSchemistToHex(value) === lastFormattedValue
				? lastFormattedValue
				: format(value))
	);

	const handleInput: FormEventHandler<HTMLInputElement> = ({
		currentTarget: input
	}) => {
		const newValue = input.value.trim();
		const [format, color] = parseColor(newValue);

		if (format && color) {
			features.colorInputFormat = format;
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
	oninput={handleInput}
/>
