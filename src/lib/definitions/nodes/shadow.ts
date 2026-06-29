import {shadowColor} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'sdw',
	label: 'Shadow',
	argsLabel: ({amount}) => `${amount}%`,
	params: [
		{
			type: 'range',
			name: 'amount',
			label: 'Amount',
			unit: '%',
			min: 0,
			max: 50,
			default: 10
		},
		{
			type: 'range',
			name: 'shift',
			label: 'Hue shift',
			unit: '%',
			min: 0,
			max: 100,
			default: 20
		}
	],
	samples: 'continuous',
	apply(color, {amount, shift}) {
		return shadowColor(color, amount, shift);
	}
} satisfies NodeDef;
