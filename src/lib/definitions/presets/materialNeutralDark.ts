import lightness from '$lib/definitions/nodes/lightness';
import saturation from '$lib/definitions/nodes/saturation';
import type {Preset} from '$lib/presets';

// @see https://m3.material.io/styles/color/the-color-system/tokens
export default {
	label: 'Material neutral dark',
	description: 'Neutral variations for dark themes',
	nodes: [
		{
			type: saturation.type,
			token: 'Desaturated $',
			isHidden: true,
			args: {
				amount: 10
			},
			children: [
				{
					type: lightness.type,
					token: 'Surface',
					args: {
						amount: 10
					}
				},
				{
					type: lightness.type,
					token: 'On surface',
					args: {
						amount: 90
					}
				},
				{
					type: lightness.type,
					token: 'Surface variant',
					args: {
						amount: 30
					}
				},
				{
					type: lightness.type,
					token: 'On surface variant',
					args: {
						amount: 80
					}
				},
				{
					type: lightness.type,
					token: 'Outline',
					args: {
						amount: 60
					}
				}
			]
		}
	]
} as Preset;
