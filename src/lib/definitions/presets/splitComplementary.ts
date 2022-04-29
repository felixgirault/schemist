import splitComplementaryLeft from '$lib/definitions/nodes/splitComplementaryLeft';
import splitComplementaryRight from '$lib/definitions/nodes/splitComplementaryRight';
import type {Preset} from '$lib/presets';

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
} as Preset;
