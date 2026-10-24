import analogous from '#lib/definitions/nodes/analogous.js';
import type {Preset} from '#lib/presets.js';
import {range} from '#lib/utils/generators.js';

export default {
	label: 'Rainbow',
	description: 'Every analogous colors',
	nodes: range(11).map((steps) => ({
		type: analogous.type,
		args: {
			steps: steps + 1
		}
	}))
} satisfies Preset;
