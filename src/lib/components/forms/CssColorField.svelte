<script lang="ts">
	import {formatSchemistTo} from '#lib/color/formatting.js';
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

	// what the user is typing, kept as is until the input is
	// committed so it doesn't get reformatted under their fingers
	let text = $state<string>();
	const formattedValue = $derived(text ?? format(value));

	const handleInput: FormEventHandler<HTMLInputElement> = ({
		currentTarget: input
	}) => {
		text = input.value;
		const [format, color] = parseColor(text.trim());

		if (format && color) {
			features.colorInputFormat = format;
			value = color;
			input.setCustomValidity('');
		} else {
			input.setCustomValidity('Invalid color');
		}
	};

	const handleChange: FormEventHandler<HTMLInputElement> = ({
		currentTarget: input
	}) => {
		if (input.reportValidity()) {
			text = undefined;
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
	onchange={handleChange}
/>
