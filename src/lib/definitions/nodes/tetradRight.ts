import {rotateHue} from '#lib/color/manipulation.js';
import type {NodeDef} from '#lib/stores/nodes.svelte.js';

export default {
	type: 'ttr',
	label: 'Right tetrad',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, 90);
	}
} satisfies NodeDef;
