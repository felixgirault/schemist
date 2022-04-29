import {setSaturation} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 's',
	label: 'Saturation',
	argsLabel: ({amount}) => `${amount}%`,
	description: 'Adjusts color vividness',
	params: [
		{
			type: 'range',
			name: 'amount',
			label: 'Amount',
			unit: '%',
			min: 0,
			max: 100,
			default: 50
		}
	],
	samples: 'continuous',
	apply(color, {amount}) {
		return setSaturation(color, amount);
	}
} as NodeDef;
