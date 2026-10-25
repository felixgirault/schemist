import type {GroupDef} from '#lib/stores/nodes.svelte.js';
import complementary from './complementary';
import materialNeutralLight from './materialNeutralLight';
import materialTonesLight from './materialTonesLight';
import negative from './negative';
import saturation from './saturation';

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
	// Tones and neutrals are groups of their own, which can be
	// ungrouped in turn.
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
} satisfies GroupDef;
