import {rotateHue} from '#lib/color/manipulation.js';
import {defineNode} from '#lib/core/nodes.js';

export default defineNode({
	type: 'trl',
	label: 'Left triad',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, -120);
	}
});
