import type {NodeDef} from '$lib/stores/nodes';
import {defaultThemeColor} from '$lib/style';

export default {
	type: 'clr',
	label: 'Custom color',
	params: [
		{
			type: 'color',
			name: 'color',
			label: 'Color',
			default: defaultThemeColor
		}
	],
	samples: 'single',
	apply(_, {color}) {
		return color;
	}
} as NodeDef;
