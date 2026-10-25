import triad from '#lib/definitions/nodes/triad.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'Triad',
	description: '',
	nodes: [{type: triad.type}]
} satisfies Preset;
