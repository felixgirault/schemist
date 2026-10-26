import lightness from '#lib/definitions/nodes/lightness.js';
import {definePreset} from '#lib/model/definitions.js';

const tones = [
	['$', 40],
	['On $', 100],
	['$ container', 90],
	['On $ container', 10]
] as const;

// @see https://m3.material.io/styles/color/the-color-system/tokens
export default definePreset({
	type: 'mtl',
	label: 'Material tones light',
	description: 'Tone variations for light themes',
	params: [],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	build() {
		return tones.map(([token, amount]) => ({
			type: lightness.type,
			token,
			args: {amount}
		}));
	}
});
