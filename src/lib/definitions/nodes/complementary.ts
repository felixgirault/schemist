import {rotateHue} from '#lib/color/manipulation.js';
import type {NodeDef} from '#lib/stores/nodes.svelte.js';

export default {
	type: 'cmp',
	label: 'Complementary',
	description: 'The opposite color',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, 180);
	}
} satisfies NodeDef;
