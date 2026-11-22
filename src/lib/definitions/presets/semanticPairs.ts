import type {Preset} from '#lib/core/nodes.js';
import contrasting from '#lib/definitions/nodes/contrasting.js';
import semantics from './semantics';

export default {
	label: 'Semantic color pairs',
	description: '',
	nodes: semantics.nodes.map((node) => ({
		...node,
		children: [
			{
				type: contrasting.type,
				token: 'On $'
			}
		]
	}))
} satisfies Preset;
