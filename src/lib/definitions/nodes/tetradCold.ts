import {
	rotateHue,
	warmerDirection
} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'ttc',
	label: 'Cold tetrad',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, -90 * warmerDirection(color));
	}
} as NodeDef;
