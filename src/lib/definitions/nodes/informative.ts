import {blueishColor} from '#lib/color/manipulation.js';
import type {NodeDef} from '#lib/stores/nodes.js';

export default {
	type: 'inf',
	label: 'Informative',
	description: 'A blueish color to convey information',
	params: [],
	samples: 'single',
	apply(color) {
		return blueishColor(color);
	}
} satisfies NodeDef;
