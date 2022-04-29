import {orangeishColor} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'wrn',
	label: 'Warning',
	description: 'An orangeish color to convey danger',
	params: [],
	samples: 'single',
	apply(color) {
		return orangeishColor(color);
	}
} as NodeDef;
