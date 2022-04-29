import {rotateHue} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
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
} as NodeDef;
