import lightness from '$lib/definitions/nodes/lightness';
import saturation from '$lib/definitions/nodes/saturation';
import type {Preset} from '$lib/presets';

export default {
	label: 'Neutral',
	description:
		'Desaturated color with various lightness levels',
	nodes: [
		{
			type: saturation.type,
			isHidden: true,
			token: 'Desaturated $',
			args: {
				amount: 5
			},
			children: [
				{
					type: lightness.type,
					token: 'Neutral white',
					args: {
						amount: 98
					}
				},
				{
					type: lightness.type,
					token: 'Neutral light',
					args: {
						amount: 85
					}
				},
				{
					type: lightness.type,
					token: 'Neutral',
					args: {
						amount: 50
					}
				},
				{
					type: lightness.type,
					token: 'Neutral dark',
					args: {
						amount: 15
					}
				},
				{
					type: lightness.type,
					token: 'Neutral black',
					args: {
						amount: 2
					}
				}
			]
		}
	]
} as Preset;
