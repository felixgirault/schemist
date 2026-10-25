import materialNeutralDark from '#lib/definitions/nodes/materialNeutralDark.js';
import type {Preset} from '#lib/presets.js';

// @see https://m3.material.io/styles/color/the-color-system/tokens
export default {
	label: 'Material neutral dark',
	description: 'Neutral variations for dark themes',
	nodes: [{type: materialNeutralDark.type}]
} satisfies Preset;
