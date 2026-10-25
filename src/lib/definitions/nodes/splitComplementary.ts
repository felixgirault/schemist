import type {GroupDef} from '#lib/stores/nodes.svelte.js';
import splitComplementaryLeft from './splitComplementaryLeft';
import splitComplementaryRight from './splitComplementaryRight';

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
} satisfies GroupDef;
