import type {GroupDef} from '#lib/stores/nodes.svelte.js';
import complementary from './complementary';
import materialNeutralDark from './materialNeutralDark';
import materialTonesDark from './materialTonesDark';
import negative from './negative';
import saturation from './saturation';

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
} satisfies GroupDef;
