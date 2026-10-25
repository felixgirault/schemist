import semanticPairs from '#lib/definitions/nodes/semanticPairs.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'Semantic color pairs',
	description: '',
	nodes: [{type: semanticPairs.type}]
} satisfies Preset;
