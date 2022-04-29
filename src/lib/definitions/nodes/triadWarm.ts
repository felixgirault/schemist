import {
	rotateHue,
	warmerDirection
} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'trw',
	label: 'Warm triad',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, 120 * warmerDirection(color));
	}
} as NodeDef;
