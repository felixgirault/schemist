<script lang="ts">
	import {
		fromHsl100,
		hslColor,
		schemistColor,
		toHsl100
	} from '$lib/color/spaces';
	import type {Hsl100, SchemistColor} from '$lib/color/spaces';
	import RangeField from '$lib/components/forms/RangeField.svelte';
	import {continuousGradient} from '$lib/utils/css';
	import {range} from '$lib/utils/generators';

	export let id: number;
	export let value: SchemistColor;

	const toSchemist = (color) =>
		schemistColor(fromHsl100(color));

	let lastValue: SchemistColor;
	let color: Hsl100;

	$: color =
		value !== lastValue ? toHsl100(hslColor(value)) : color;

	const inputHandler =
		(channel: string) => (channelValue: number) => {
			color[channel] = channelValue;
			value = lastValue = toSchemist(color);
		};
</script>

<RangeField
	id={`${id}-h`}
	label="Hue"
	max={360}
	unit="°"
	gradient={continuousGradient(
		range(12).map((i) => toSchemist({...color, h: i * 30}))
	)}
	value={color.h}
	onInput={inputHandler('h')}
/>

<RangeField
	id={`${id}-s`}
	label="Saturation"
	unit="%"
	gradient={continuousGradient(
		range(10).map((i) => toSchemist({...color, s: i * 10}))
	)}
	value={color.s}
	onInput={inputHandler('s')}
/>

<RangeField
	id={`${id}-l`}
	label="Lightness"
	unit="%"
	gradient={continuousGradient(
		range(10).map((i) => toSchemist({...color, l: i * 10}))
	)}
	value={color.l}
	onInput={inputHandler('l')}
/>
