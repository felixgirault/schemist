import splitComplementaryLeft from '#lib/definitions/nodes/splitComplementaryLeft.js';
import splitComplementaryRight from '#lib/definitions/nodes/splitComplementaryRight.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'Split complementary',
	description: '',
	nodes: [
		{
			type: splitComplementaryLeft.type,
			token: 'Left $ complementary'
		},
		{
			type: splitComplementaryRight.type,
			token: 'Right $ complementary'
		}
	]
} satisfies Preset;
