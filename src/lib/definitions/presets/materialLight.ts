import complementary from '#lib/definitions/nodes/complementary.js';
import negative from '#lib/definitions/nodes/negative.js';
import saturation from '#lib/definitions/nodes/saturation.js';
import type {PresetDef} from '#lib/stores/nodes.svelte.js';
import materialNeutralLight from './materialNeutralLight';
import materialTonesLight from './materialTonesLight';

export default {
	type: 'mal',
	label: 'Material light',
	description:
		'Variations inspired by Material You for light themes',
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
					{type: materialTonesLight.type},
					{
						type: complementary.type,
						token: 'Complementary',
						isHidden: true,
						children: [{type: materialTonesLight.type}]
					},
					{
						type: negative.type,
						token: 'Error',
						isHidden: true,
						children: [{type: materialTonesLight.type}]
					},
					{type: materialNeutralLight.type}
				]
			}
		];
	}
} satisfies PresetDef;
