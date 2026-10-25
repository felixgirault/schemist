import materialTonesDark from '#lib/definitions/nodes/materialTonesDark.js';
import type {Preset} from '#lib/presets.js';

// @see https://m3.material.io/styles/color/the-color-system/tokens
export default {
	label: 'Material tones dark',
	description: 'Tone variations for dark themes',
	nodes: [{type: materialTonesDark.type}]
} satisfies Preset;
