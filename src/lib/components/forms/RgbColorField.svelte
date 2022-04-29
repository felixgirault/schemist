<script lang="ts">
	import {
		fromRgb255,
		rgbColor,
		schemistColor,
		toRgb255
	} from '$lib/color/spaces';
	import type {SchemistColor} from '$lib/color/spaces';
	import RangeField from '$lib/components/forms/RangeField.svelte';
	import {continuousGradient} from '$lib/utils/css';
	import {range} from '$lib/utils/generators';

	export let id: number;
	export let value: SchemistColor;

	$: color = toRgb255(rgbColor(value));

	const inputHandler =
		(channel: string) => (channelValue: number) => {
			value = schemistColor(
				fromRgb255({...color, [channel]: channelValue})
			);
		};
</script>

<RangeField
	id={`${id}-r`}
	label="Red"
	max={255}
	gradient={continuousGradient(
		range(8).map((i) =>
			schemistColor(
				fromRgb255({...color, r: Math.floor(i * 32)})
			)
		)
	)}
	value={color.r}
	onInput={inputHandler('r')}
/>

<RangeField
	id={`${id}-g`}
	label="Green"
	max={255}
	gradient={continuousGradient(
		range(8).map((i) =>
			schemistColor(
				fromRgb255({...color, g: Math.floor(i * 32)})
			)
		)
	)}
	value={color.g}
	onInput={inputHandler('g')}
/>

<RangeField
	id={`${id}-b`}
	label="Blue"
	max={255}
	gradient={continuousGradient(
		range(8).map((i) =>
			schemistColor(
				fromRgb255({...color, b: Math.floor(i * 32)})
			)
		)
	)}
	value={color.b}
	onInput={inputHandler('b')}
/>
