import materialTonesLight from '#lib/definitions/nodes/materialTonesLight.js';
import type {Preset} from '#lib/presets.js';

// @see https://m3.material.io/styles/color/the-color-system/tokens
export default {
	label: 'Material tones light',
	description: 'Tone variations for light themes',
	nodes: [{type: materialTonesLight.type}]
} satisfies Preset;
