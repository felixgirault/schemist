import {rotateHue} from '#lib/color/manipulation.js';
import {defineNode} from '#lib/definitions/define.js';

export default defineNode({
	type: 'cmp',
	label: 'Complementary',
	description: 'The opposite color',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, 180);
	}
});
