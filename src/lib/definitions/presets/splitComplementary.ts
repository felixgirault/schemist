import splitComplementaryLeft from '#lib/definitions/nodes/splitComplementaryLeft.js';
import splitComplementaryRight from '#lib/definitions/nodes/splitComplementaryRight.js';
import type {PresetDef} from '#lib/stores/nodes.svelte.js';

export default {
	type: 'spc',
	label: 'Split complementary',
	description: 'Hues on each side of the complementary color',
	params: [],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	build() {
		return [
			{
				type: splitComplementaryLeft.type,
				token: 'Left $ complementary'
			},
			{
				type: splitComplementaryRight.type,
				token: 'Right $ complementary'
			}
		];
	}
} satisfies PresetDef;
