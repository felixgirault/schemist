import rainbow from '#lib/definitions/nodes/rainbow.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'Rainbow',
	description: 'Every analogous colors',
	nodes: [{type: rainbow.type}]
} satisfies Preset;
