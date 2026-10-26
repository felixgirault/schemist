import {orangeishColor} from '#lib/color/manipulation.js';
import {defineNode} from '#lib/definitions/define.js';

export default defineNode({
	type: 'wrn',
	label: 'Warning',
	description: 'An orangeish color to convey danger',
	params: [],
	samples: 'single',
	apply(color) {
		return orangeishColor(color);
	}
});
