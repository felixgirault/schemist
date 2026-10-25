import states from '#lib/definitions/nodes/states.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'States',
	description: 'Highlight and shadow',
	nodes: [{type: states.type}]
} satisfies Preset;
