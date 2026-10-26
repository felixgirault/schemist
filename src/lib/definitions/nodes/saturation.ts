import {setSaturation} from '#lib/color/manipulation.js';
import {defineNode} from '#lib/definitions/define.js';

export default defineNode({
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
});
