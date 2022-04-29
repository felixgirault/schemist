import {greenishColor} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'pos',
	label: 'Positive',
	description: 'A greenish color to convey positiveness',
	params: [],
	samples: 'single',
	apply(color) {
		return greenishColor(color);
	}
} as NodeDef;
