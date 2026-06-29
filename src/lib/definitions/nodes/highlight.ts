import {highlightColor} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'hlt',
	label: 'Highlight',
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
		return highlightColor(color, amount, shift);
	}
} satisfies NodeDef;
