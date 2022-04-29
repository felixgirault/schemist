import tetradLeft from '$lib/definitions/nodes/tetradLeft';
import tetradRight from '$lib/definitions/nodes/tetradRight';
import type {Preset} from '$lib/presets';

export default {
	label: 'Tetrad',
	description: '',
	nodes: [
		{
			type: tetradLeft.type,
			token: 'Left $ tetrad'
		},
		{
			type: tetradRight.type,
			token: 'Right $ tetrad'
		}
	]
} as Preset;
