import analogous from '$lib/definitions/nodes/analogous';
import type {Preset} from '$lib/presets';
import {range} from '$lib/utils/generators';

export default {
	label: 'Rainbow',
	description: 'Every analogous colors',
	nodes: range(11).map((steps) => ({
		type: analogous.type,
		args: {
			steps: steps + 1
		}
	}))
} as Preset;
