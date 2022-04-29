import {
	rotateHue,
	warmerDirection
} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'ttw',
	label: 'Warm tetrad',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, 90 * warmerDirection(color));
	}
} as NodeDef;
