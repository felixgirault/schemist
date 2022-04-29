import {setLightness} from '$lib/color/manipulation';
import type {NodeDef} from '$lib/stores/nodes';

export default {
	type: 'l',
	label: `Lightness`,
	argsLabel: ({amount}) => `${amount}%`,
	description: 'Adjusts color luminosity',
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
		return setLightness(color, amount);
	}
} as NodeDef;
