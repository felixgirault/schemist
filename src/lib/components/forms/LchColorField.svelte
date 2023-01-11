<script lang="ts">
	import {
		lchToSchemist,
		schemistToLch
	} from '$lib/color/conversion';
	import type {LchColor, SchemistColor} from '$lib/color/types';
	import RangeField from '$lib/components/forms/RangeField.svelte';
	import {continuousGradient} from '$lib/utils/css';
	import {range} from '$lib/utils/generators';

	export let id: number;
	export let value: SchemistColor;

	let lastValue: SchemistColor;
	let color: LchColor;

	$: color = value !== lastValue ? schemistToLch(value) : color;

	const inputHandler =
		(channel: keyof LchColor) => (channelValue: number) => {
			color[channel] = channelValue;
			value = lastValue = lchToSchemist(color);
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
