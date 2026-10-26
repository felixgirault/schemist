import lightness from '#lib/definitions/nodes/lightness.js';
import saturation from '#lib/definitions/nodes/saturation.js';
import {definePreset} from '#lib/model/definitions.js';

const levels = [
	['Surface', 10],
	['On surface', 90],
	['Surface variant', 30],
	['On surface variant', 80],
	['Outline', 60]
] as const;

// @see https://m3.material.io/styles/color/the-color-system/tokens
export default definePreset({
	type: 'mnd',
	label: 'Material neutral dark',
	description: 'Neutral variations for dark themes',
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
