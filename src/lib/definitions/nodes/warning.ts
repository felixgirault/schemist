import {orangeishColor} from '#lib/color/manipulation.js';
import type {NodeDef} from '#lib/stores/nodes.svelte.js';

export default {
	type: 'wrn',
	label: 'Warning',
	description: 'An orangeish color to convey danger',
	params: [],
	samples: 'single',
	apply(color) {
		return orangeishColor(color);
	}
} satisfies NodeDef;
