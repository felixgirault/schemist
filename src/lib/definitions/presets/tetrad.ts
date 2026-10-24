import tetradLeft from '#lib/definitions/nodes/tetradLeft.js';
import tetradRight from '#lib/definitions/nodes/tetradRight.js';
import type {Preset} from '#lib/presets.js';

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
} satisfies Preset;
