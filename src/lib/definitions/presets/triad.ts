import triadLeft from '#lib/definitions/nodes/triadLeft.js';
import triadRight from '#lib/definitions/nodes/triadRight.js';
import type {Preset} from '#lib/presets.js';

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
} satisfies Preset;
