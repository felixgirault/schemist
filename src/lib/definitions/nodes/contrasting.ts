import {contrastingColor} from '#lib/color/manipulation.js';
import {defineNode} from '#lib/model/definitions.js';

export default defineNode({
	type: 'ctr',
	label: 'Contrasting',
	description:
		'A color with the same hue that is contrasting enough',
	params: [
		{
			type: 'range',
			name: 'amount',
			label: 'Amount',
			unit: '%',
			min: 0,
			max: 100,
			default: 80
		}
	],
	samples: 'continuous',
	apply(color, {amount}) {
		return contrastingColor(color, amount);
	}
});
