import {rotateHue} from '#lib/color/manipulation.js';
import {defineNode} from '#lib/definitions/define.js';

export default defineNode({
	type: 'ttr',
	label: 'Right tetrad',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, 90);
	}
});
