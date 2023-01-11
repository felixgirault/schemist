<script lang="ts">
	import {
		hslToSchemist,
		schemistToHsl
	} from '$lib/color/conversion';
	import type {HslColor, SchemistColor} from '$lib/color/types';
	import RangeField from '$lib/components/forms/RangeField.svelte';
	import {continuousGradient} from '$lib/utils/css';
	import {range} from '$lib/utils/generators';

	export let id: number;
	export let value: SchemistColor;

	let lastValue: SchemistColor;
	let color: HslColor;

	$: color = value !== lastValue ? schemistToHsl(value) : color;

	const inputHandler =
		(channel: keyof SchemistColor) =>
		(channelValue: number) => {
			color[channel] = channelValue;
			value = lastValue = hslToSchemist(color);
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
