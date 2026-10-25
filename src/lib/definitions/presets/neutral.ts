import neutral from '#lib/definitions/nodes/neutral.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'Neutral',
	description:
		'Desaturated color with various lightness levels',
	nodes: [{type: neutral.type}]
} satisfies Preset;
