<script lang="ts">
	import {
		lchToSchemist,
		schemistToLch
	} from '#lib/color/conversion.js';
	import type {
		LchColor,
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

	// keeps the exact lch channels while the value round-trips,
	// as converting back from SchemistColor is lossy
	let lastValue: SchemistColor | undefined;
	let lastColor: LchColor | undefined;
	const color = $derived(
		value === lastValue && lastColor
			? lastColor
			: schemistToLch(value)
	);

	const inputHandler =
		(channel: keyof LchColor) => (channelValue: number) => {
			lastColor = {...color, [channel]: channelValue};
			value = lastValue = lchToSchemist(lastColor);
		};
</script>

<RangeField
	id={`${id}-h`}
	label="Hue"
	max={360}
	unit="°"
	gradient={continuousGradient(
		range(12).map((i) => lchToSchemist({...color, h: i * 30}))
	)}
	value={color.h}
	onInput={inputHandler('h')}
/>

<RangeField
	id={`${id}-c`}
	label="Chroma"
	gradient={continuousGradient(
		range(10).map((i) => lchToSchemist({...color, c: i * 10}))
	)}
	value={color.c}
	onInput={inputHandler('c')}
/>

<RangeField
	id={`${id}-l`}
	label="Lightness"
	unit="%"
	gradient={continuousGradient(
		range(10).map((i) => lchToSchemist({...color, l: i * 10}))
	)}
	value={color.l}
	onInput={inputHandler('l')}
/>
