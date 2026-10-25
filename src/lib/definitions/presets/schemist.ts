import schemist from '#lib/definitions/nodes/schemist.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'Schemist theme',
	description: '',
	nodes: [{type: schemist.type}]
} satisfies Preset;
