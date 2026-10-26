import contrasting from '#lib/definitions/nodes/contrasting.js';
import {definePreset} from '#lib/model/definitions.js';
import semantics from './semantics';

export default definePreset({
	type: 'smp',
	label: 'Semantic color pairs',
	description: 'Semantic colors, each with a contrasting color',
	params: [],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	build() {
		return semantics.build({}).map((node) => ({
			...node,
			children: [{type: contrasting.type, token: 'On $'}]
		}));
	}
});
