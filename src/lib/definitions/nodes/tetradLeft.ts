import {rotateHue} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'ttl',
	label: 'Left tetrad',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, -90);
	}
} as NodeDef;
