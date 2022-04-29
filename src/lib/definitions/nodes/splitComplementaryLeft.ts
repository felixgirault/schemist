import {rotateHue} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'scl',
	label: 'Left split complementary',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, -150);
	}
} as NodeDef;
