import contrasting from '#lib/definitions/nodes/contrasting.js';
import type {PresetDef} from '#lib/stores/nodes.svelte.js';
import semantics from './semantics';

export default {
	type: 'smp',
	label: 'Semantic color pairs',
	description: 'Semantic colors, each with a contrasting color',
	params: [],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	build() {
		return semantics.build().map((node) => ({
			...node,
			children: [{type: contrasting.type, token: 'On $'}]
		}));
	}
} satisfies PresetDef;
