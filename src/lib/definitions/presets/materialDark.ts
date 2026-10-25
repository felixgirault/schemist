import materialDark from '#lib/definitions/nodes/materialDark.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'Material dark',
	description:
		'Variations inspired by Material You for dark themes',
	nodes: [{type: materialDark.type}]
} satisfies Preset;
