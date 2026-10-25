import materialNeutralLight from '#lib/definitions/nodes/materialNeutralLight.js';
import type {Preset} from '#lib/presets.js';

// @see https://m3.material.io/styles/color/the-color-system/tokens
export default {
	label: 'Material neutral light',
	description: 'Neutral variations for light themes',
	nodes: [{type: materialNeutralLight.type}]
} satisfies Preset;
