import triadLeft from '$lib/definitions/nodes/triadLeft';
import triadRight from '$lib/definitions/nodes/triadRight';
import type {Preset} from '$lib/presets';

export default {
	label: 'Triad',
	description: '',
	nodes: [
		{
			type: triadLeft.type,
			token: 'Left $ triad'
		},
		{
			type: triadRight.type,
			token: 'Right $ triad'
		}
	]
} as Preset;
