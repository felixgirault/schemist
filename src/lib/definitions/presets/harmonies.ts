import harmonies from '#lib/definitions/nodes/harmonies.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'Harmonies',
	description: 'All available color harmonies',
	nodes: [{type: harmonies.type}]
} satisfies Preset;
