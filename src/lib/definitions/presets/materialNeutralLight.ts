import {definePreset} from '#lib/definitions/define.js';
import lightness from '#lib/definitions/nodes/lightness.js';
import saturation from '#lib/definitions/nodes/saturation.js';

const levels = [
	['Surface', 99],
	['On surface', 10],
	['Surface variant', 90],
	['On surface variant', 30],
	['Outline', 50]
] as const;

// @see https://m3.material.io/styles/color/the-color-system/tokens
export default definePreset({
	type: 'mnl',
	label: 'Material neutral light',
	description: 'Neutral variations for light themes',
	params: [],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	build() {
		return [
			{
				type: saturation.type,
				token: 'Desaturated $',
				isHidden: true,
				args: {amount: 10},
				children: levels.map(([token, amount]) => ({
					type: lightness.type,
					token,
					args: {amount}
				}))
			}
		];
	}
});
