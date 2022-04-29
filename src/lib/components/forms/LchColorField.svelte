<script lang="ts">
	import {clampChroma} from 'culori/fn';
	import {
		fromLch100,
		schemistColor,
		toLch100
	} from '$lib/color/spaces';
	import type {Lch100, SchemistColor} from '$lib/color/spaces';
	import {lchColor} from '$lib/color/spaces';
	import RangeField from '$lib/components/forms/RangeField.svelte';
	import {continuousGradient} from '$lib/utils/css';
	import {range} from '$lib/utils/generators';

	export let id: number;
	export let value: SchemistColor;

	const toSchemist = (color) =>
		schemistColor(clampChroma(fromLch100(color)));

	let lastValue: SchemistColor;
	let color: Lch100;

	$: color =
		value !== lastValue ? toLch100(lchColor(value)) : color;

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
	id={`${id}-c`}
	label="Chroma"
	gradient={continuousGradient(
		range(10).map((i) => toSchemist({...color, c: i * 10}))
	)}
	value={color.c}
	onInput={inputHandler('c')}
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
