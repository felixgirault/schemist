import triadCold from '$lib/definitions/nodes/triadCold';
import triadWarm from '$lib/definitions/nodes/triadWarm';
import type {Preset} from '$lib/presets';

export default {
	label: 'Triad',
	description: '',
	nodes: [
		{
			type: triadCold.type,
			token: 'Cold $ triad'
		},
		{
			type: triadWarm.type,
			token: 'Warm $ triad'
		}
	]
} as Preset;
