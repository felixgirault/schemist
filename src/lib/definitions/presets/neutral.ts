import {definePreset} from '#lib/definitions/define.js';
import lightness from '#lib/definitions/nodes/lightness.js';
import saturation from '#lib/definitions/nodes/saturation.js';

const levels = [
	['Neutral white', 98],
	['Neutral light', 85],
	['Neutral', 50],
	['Neutral dark', 15],
	['Neutral black', 2]
] as const;

export default definePreset({
	type: 'ntl',
	label: 'Neutral',
	argsLabel: ({amount}) => `${amount}%`,
	description:
		'Desaturated color with various lightness levels',
	params: [
		{
			type: 'range',
			name: 'amount',
			label: 'Saturation',
			unit: '%',
			min: 0,
			max: 100,
			default: 5
		}
	],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	build({amount}) {
		return [
			{
				type: saturation.type,
				isHidden: true,
				token: 'Desaturated $',
				args: {amount},
				children: levels.map(([token, level]) => ({
					type: lightness.type,
					token,
					args: {amount: level}
				}))
			}
		];
	}
});
