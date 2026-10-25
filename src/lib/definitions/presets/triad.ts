import triadLeft from '#lib/definitions/nodes/triadLeft.js';
import triadRight from '#lib/definitions/nodes/triadRight.js';
import type {PresetDef} from '#lib/stores/nodes.svelte.js';

export default {
	type: 'trd',
	label: 'Triad',
	description: 'Hues evenly spread in three',
	params: [],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	build() {
		return [
			{type: triadLeft.type, token: 'Left $ triad'},
			{type: triadRight.type, token: 'Right $ triad'}
		];
	}
} satisfies PresetDef;
