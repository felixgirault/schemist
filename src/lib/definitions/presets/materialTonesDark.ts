import lightness from '#lib/definitions/nodes/lightness.js';
import type {PresetDef} from '#lib/stores/nodes.svelte.js';

const tones = [
	['$', 80],
	['On $', 20],
	['$ container', 30],
	['On $ container', 90]
] as const;

// @see https://m3.material.io/styles/color/the-color-system/tokens
export default {
	type: 'mtd',
	label: 'Material tones dark',
	description: 'Tone variations for dark themes',
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
} satisfies PresetDef;
