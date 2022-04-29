import lightness from '$lib/definitions/nodes/lightness';
import type {Preset} from '$lib/presets';

// @see https://m3.material.io/styles/color/the-color-system/tokens
export default {
	label: 'Material tones dark',
	description: 'Tone variations for dark themes',
	nodes: [
		{
			type: lightness.type,
			token: '$',
			args: {
				amount: 80
			}
		},
		{
			type: lightness.type,
			token: 'On $',
			args: {
				amount: 20
			}
		},
		{
			type: lightness.type,
			token: '$ container',
			args: {
				amount: 30
			}
		},
		{
			type: lightness.type,
			token: 'On $ container',
			args: {
				amount: 90
			}
		}
	]
} as Preset;
