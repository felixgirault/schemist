import complementary from '#lib/definitions/nodes/complementary.js';
import negative from '#lib/definitions/nodes/negative.js';
import saturation from '#lib/definitions/nodes/saturation.js';
import type {PresetDef} from '#lib/stores/nodes.svelte.js';
import materialNeutralDark from './materialNeutralDark';
import materialTonesDark from './materialTonesDark';

export default {
	type: 'mad',
	label: 'Material dark',
	description:
		'Variations inspired by Material You for dark themes',
	params: [],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	// Tones and neutrals are presets of their own, which can be
	// expanded in turn.
	build() {
		return [
			{
				type: saturation.type,
				token: 'Primary',
				isHidden: true,
				args: {amount: 40},
				children: [
					{type: materialTonesDark.type},
					{
						type: complementary.type,
						token: 'Complementary',
						isHidden: true,
						children: [{type: materialTonesDark.type}]
					},
					{
						type: negative.type,
						token: 'Error',
						isHidden: true,
						children: [{type: materialTonesDark.type}]
					},
					{type: materialNeutralDark.type}
				]
			}
		];
	}
} satisfies PresetDef;
