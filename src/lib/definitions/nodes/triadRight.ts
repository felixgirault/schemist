import {rotateHue} from '#lib/color/manipulation.js';
import type {NodeDef} from '#lib/core/nodes.js';

export default {
	type: 'trr',
	label: 'Right triad',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, 120);
	}
} satisfies NodeDef;
