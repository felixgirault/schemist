import {rotateHue} from '#lib/color/manipulation.js';
import type {NodeDef} from '#lib/stores/nodes.js';

export default {
	type: 'scr',
	label: 'Right split complementary',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, 150);
	}
} satisfies NodeDef;
