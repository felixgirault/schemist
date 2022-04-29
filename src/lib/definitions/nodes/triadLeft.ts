import {rotateHue} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'trl',
	label: 'Left triad',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, -120);
	}
} as NodeDef;
