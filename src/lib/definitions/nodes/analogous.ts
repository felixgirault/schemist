import {rotateHue} from '#lib/color/manipulation.js';
import {defineNode} from '#lib/definitions/define.js';

export default defineNode({
	type: 'anl',
	label: 'Analogous',
	params: [
		{
			type: 'range',
			name: 'steps',
			label: 'Steps',
			min: 1,
			max: 11,
			default: 1
		}
	],
	samples: 'discrete',
	apply(color, {steps}) {
		return rotateHue(color, steps * 30);
	}
});
