import tetradCold from '$lib/definitions/nodes/tetradCold';
import tetradWarm from '$lib/definitions/nodes/tetradWarm';
import type {Preset} from '$lib/presets';

export default {
	label: 'Tetrad',
	description: '',
	nodes: [
		{
			type: tetradCold.type,
			token: 'Cold $ tetrad'
		},
		{
			type: tetradWarm.type,
			token: 'Warm $ tetrad'
		}
	]
} as Preset;
