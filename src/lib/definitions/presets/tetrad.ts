import tetrad from '#lib/definitions/nodes/tetrad.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'Tetrad',
	description: '',
	nodes: [{type: tetrad.type}]
} satisfies Preset;
