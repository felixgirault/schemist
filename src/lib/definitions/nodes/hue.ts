import {rotateHue} from '#lib/color/manipulation.js';
import {defineNode} from '#lib/definitions/define.js';

export default defineNode({
	type: 'h',
	label: 'Hue',
	params: [
		{
			type: 'range',
			name: 'degrees',
			label: 'Degrees',
			unit: '°',
			min: 0,
			max: 360,
			default: 180
		}
	],
	samples: 'continuous',
	apply(color, {degrees}) {
		return rotateHue(color, degrees);
	}
});
