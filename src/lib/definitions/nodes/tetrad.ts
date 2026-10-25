import type {GroupDef} from '#lib/stores/nodes.svelte.js';
import tetradLeft from './tetradLeft';
import tetradRight from './tetradRight';

export default {
	type: 'ttd',
	label: 'Tetrad',
	description: 'Hues evenly spread in four',
	params: [],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	build() {
		return [
			{type: tetradLeft.type, token: 'Left $ tetrad'},
			{type: tetradRight.type, token: 'Right $ tetrad'}
		];
	}
} satisfies GroupDef;
