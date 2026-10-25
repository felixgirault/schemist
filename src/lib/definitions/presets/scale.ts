import scale from '#lib/definitions/nodes/scale.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'Scale',
	description: 'Different lightness levels from dark to light',
	nodes: [{type: scale.type}]
} satisfies Preset;
