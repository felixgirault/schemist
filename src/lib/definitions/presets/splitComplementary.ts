import splitComplementaryCold from '$lib/definitions/nodes/splitComplementaryCold';
import splitComplementaryWarm from '$lib/definitions/nodes/splitComplementaryWarm';
import type {Preset} from '$lib/presets';

export default {
	label: 'Split complementary',
	description: '',
	nodes: [
		{
			type: splitComplementaryCold.type,
			token: 'Cold $ complementary'
		},
		{
			type: splitComplementaryWarm.type,
			token: 'Warm $ complementary'
		}
	]
} as Preset;
