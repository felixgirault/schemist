import type {GroupDef} from '#lib/stores/nodes.svelte.js';
import triadLeft from './triadLeft';
import triadRight from './triadRight';

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
} satisfies GroupDef;
