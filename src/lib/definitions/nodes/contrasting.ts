import {contrastingColor} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
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
	samples: 'single',
	apply(color, {amount}) {
		return contrastingColor(color, amount);
	}
} as NodeDef;
