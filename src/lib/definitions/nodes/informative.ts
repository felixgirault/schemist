import {blueishColor} from '#lib/color/manipulation.js';
import {defineNode} from '#lib/definitions/define.js';

export default defineNode({
	type: 'inf',
	label: 'Informative',
	description: 'A blueish color to convey information',
	params: [],
	samples: 'single',
	apply(color) {
		return blueishColor(color);
	}
});
