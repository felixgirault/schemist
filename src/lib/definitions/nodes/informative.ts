import {blueishColor} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'inf',
	label: 'Informative',
	description: 'A blueish color to convey information',
	params: [],
	samples: 'single',
	apply(color) {
		return blueishColor(color);
	}
} as NodeDef;
