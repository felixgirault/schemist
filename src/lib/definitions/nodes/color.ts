import {defineNode} from '#lib/definitions/define.js';
import {defaultThemeColor} from '#lib/style.js';

export default defineNode({
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
});
