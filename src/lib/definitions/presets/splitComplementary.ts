import splitComplementaryLeft from '#lib/definitions/nodes/splitComplementaryLeft.js';
import splitComplementaryRight from '#lib/definitions/nodes/splitComplementaryRight.js';
import {definePreset} from '#lib/model/definitions.js';

export default definePreset({
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
});
