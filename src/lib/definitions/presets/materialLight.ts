import materialLight from '#lib/definitions/nodes/materialLight.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'Material light',
	description:
		'Variations inspired by Material You for light themes',
	nodes: [{type: materialLight.type}]
} satisfies Preset;
