import {rotateHue} from '#lib/color/manipulation.js';
import {defineNode} from '#lib/model/definitions.js';

export default defineNode({
	type: 'ttl',
	label: 'Left tetrad',
	description: '',
	params: [],
	samples: 'single',
	apply(color) {
		return rotateHue(color, -90);
	}
});
