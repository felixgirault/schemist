import {
	rotateHue,
	warmerDirection
} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'trc',
	label: 'Cold triad',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, -120 * warmerDirection(color));
	}
} as NodeDef;
