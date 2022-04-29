import {reddishColor} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'neg',
	label: 'Negative',
	description: 'A reddish color to convey negativeness',
	params: [],
	samples: 'single',
	apply(color) {
		return reddishColor(color);
	}
} as NodeDef;
