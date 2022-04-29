import contrasting from '$lib/definitions/nodes/contrasting';
import type {Preset} from '$lib/presets';
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
} as Preset;
