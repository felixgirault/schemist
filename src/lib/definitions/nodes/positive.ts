import {greenishColor} from '#lib/color/manipulation.js';
import {defineNode} from '#lib/model/definitions.js';

export default defineNode({
	type: 'pos',
	label: 'Positive',
	description: 'A greenish color to convey positiveness',
	params: [],
	samples: 'single',
	apply(color) {
		return greenishColor(color);
	}
});
