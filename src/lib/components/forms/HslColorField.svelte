<script lang="ts">
	import {
		hslToSchemist,
		schemistToHsl
	} from '#lib/color/conversion.js';
	import type {
		HslColor,
		SchemistColor
	} from '#lib/color/types.js';
	import RangeField from '#lib/components/forms/RangeField.svelte';
	import {continuousGradient} from '#lib/utils/css.js';
	import {range} from '#lib/utils/generators.js';

	interface Props {
		id: number;
		value: SchemistColor;
	}

	let {id, value = $bindable()}: Props = $props();

	// keeps the exact hsl channels while the value round-trips,
	// as converting back from SchemistColor is lossy
	let lastValue: SchemistColor | undefined;
	let lastColor: HslColor | undefined;
	const color = $derived(
		value === lastValue && lastColor
			? lastColor
			: schemistToHsl(value)
	);

	const inputHandler =
		(channel: keyof HslColor) => (channelValue: number) => {
			lastColor = {...color, [channel]: channelValue};
			value = lastValue = hslToSchemist(lastColor);
		};
</script>

<RangeField
	id={`${id}-h`}
	label="Hue"
	max={360}
	unit="°"
	gradient={continuousGradient(
		range(12).map((i) => hslToSchemist({...color, h: i * 30}))
	)}
	value={color.h}
	onInput={inputHandler('h')}
/>

<RangeField
	id={`${id}-s`}
	label="Saturation"
	unit="%"
	gradient={continuousGradient(
		range(10).map((i) => hslToSchemist({...color, s: i * 10}))
	)}
	value={color.s}
	onInput={inputHandler('s')}
/>

<RangeField
	id={`${id}-l`}
	label="Lightness"
	unit="%"
	gradient={continuousGradient(
		range(10).map((i) => hslToSchemist({...color, l: i * 10}))
	)}
	value={color.l}
	onInput={inputHandler('l')}
/>
