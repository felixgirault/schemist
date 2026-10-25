import splitComplementary from '#lib/definitions/nodes/splitComplementary.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'Split complementary',
	description: '',
	nodes: [{type: splitComplementary.type}]
} satisfies Preset;
