import {reddishColor} from '#lib/color/manipulation.js';
import type {NodeDef} from '#lib/stores/nodes.js';

export default {
	type: 'neg',
	label: 'Negative',
	description: 'A reddish color to convey negativeness',
	params: [],
	samples: 'single',
	apply(color) {
		return reddishColor(color);
	}
} satisfies NodeDef;
