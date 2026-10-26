import {rotateHue} from '#lib/color/manipulation.js';
import {defineNode} from '#lib/definitions/define.js';

export default defineNode({
	type: 'scr',
	label: 'Right split complementary',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, 150);
	}
});
