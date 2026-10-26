import {reddishColor} from '#lib/color/manipulation.js';
import {defineNode} from '#lib/definitions/define.js';

export default defineNode({
	type: 'neg',
	label: 'Negative',
	description: 'A reddish color to convey negativeness',
	params: [],
	samples: 'single',
	apply(color) {
		return reddishColor(color);
	}
});
