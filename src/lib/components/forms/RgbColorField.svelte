<script lang="ts">
	import {
		rgbToSchemist,
		schemistToRgb
	} from '#lib/color/conversion.js';
	import type {SchemistColor} from '#lib/color/types.js';
	import RangeField from '#lib/components/forms/RangeField.svelte';
	import {continuousGradient} from '#lib/utils/css.js';
	import {range} from '#lib/utils/generators.js';

	interface Props {
		id: number;
		value: SchemistColor;
	}

	let {id, value = $bindable()}: Props = $props();

	let color = $derived(schemistToRgb(value));

	const inputHandler =
		(channel: string) => (channelValue: number) => {
			value = rgbToSchemist({
				...color,
				[channel]: channelValue
			});
		};
</script>

<RangeField
	id={`${id}-r`}
	label="Red"
	max={255}
	gradient={continuousGradient(
		range(8).map((i) =>
			rgbToSchemist({...color, r: Math.floor(i * 32)})
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
			rgbToSchemist({...color, g: Math.floor(i * 32)})
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
			rgbToSchemist({...color, b: Math.floor(i * 32)})
		)
	)}
	value={color.b}
	onInput={inputHandler('b')}
/>
