import {rotateHue} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'ttr',
	label: 'Right tetrad',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, 90);
	}
} as NodeDef;
