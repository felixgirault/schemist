import {greenishColor} from '#lib/color/manipulation.js';
import type {NodeDef} from '#lib/stores/nodes.js';

export default {
	type: 'pos',
	label: 'Positive',
	description: 'A greenish color to convey positiveness',
	params: [],
	samples: 'single',
	apply(color) {
		return greenishColor(color);
	}
} satisfies NodeDef;
