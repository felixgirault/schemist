import type {Preset} from '$lib/presets';
import triadLeft from '../nodes/triadLeft';
import triadRight from '../nodes/triadRight';
import neutral from './neutral';
import semanticPairs from './semanticPairs';
import states from './states';

export default {
	label: 'Schemist theme',
	description: '',
	nodes: [
		{
			type: triadLeft.type,
			token: 'Secondary',
			children: states.nodes
		},
		{
			type: triadRight.type,
			token: 'Tertiary',
			children: states.nodes
		},
		...semanticPairs.nodes,
		...neutral.nodes
	]
} as Preset;
