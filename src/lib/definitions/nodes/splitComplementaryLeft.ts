import {rotateHue} from '#lib/color/manipulation.js';
import type {NodeDef} from '#lib/stores/nodes.svelte.js';

export default {
	type: 'scl',
	label: 'Left split complementary',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, -150);
	}
} satisfies NodeDef;
