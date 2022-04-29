import {
	rotateHue,
	warmerDirection
} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'scw',
	label: 'Warm split complementary',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, 150 * warmerDirection(color));
	}
} as NodeDef;
