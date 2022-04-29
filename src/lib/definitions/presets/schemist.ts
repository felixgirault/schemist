import type {Preset} from '$lib/presets';
import triadCold from '../nodes/triadCold';
import triadWarm from '../nodes/triadWarm';
import neutral from './neutral';
import semanticPairs from './semanticPairs';
import states from './states';

export default {
	label: 'Schemist theme',
	description: '',
	nodes: [
		{
			type: triadWarm.type,
			token: 'Secondary',
			children: states.nodes
		},
		{
			type: triadCold.type,
			token: 'Tertiary',
			children: states.nodes
		},
		...semanticPairs.nodes,
		...neutral.nodes
	]
} as Preset;
