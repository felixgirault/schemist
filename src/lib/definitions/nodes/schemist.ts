import type {GroupDef} from '#lib/stores/nodes.svelte.js';
import neutral from './neutral';
import semanticPairs from './semanticPairs';
import states from './states';
import triadLeft from './triadLeft';
import triadRight from './triadRight';

export default {
	type: 'sch',
	label: 'Schemist theme',
	description: 'Accents, semantic colors and neutrals',
	params: [
		{
			type: 'boolean',
			name: 'accents',
			label: 'Secondary & tertiary',
			default: true
		},
		{
			type: 'boolean',
			name: 'semantics',
			label: 'Semantic colors',
			default: true
		},
		{
			type: 'boolean',
			name: 'neutrals',
			label: 'Neutrals',
			default: true
		}
	],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	// States, semantic pairs and neutrals are groups of their own,
	// which can be ungrouped in turn.
	build({accents, semantics, neutrals}) {
		return [
			...(accents
				? [
						{
							type: triadLeft.type,
							token: 'Secondary',
							children: [{type: states.type}]
						},
						{
							type: triadRight.type,
							token: 'Tertiary',
							children: [{type: states.type}]
						}
					]
				: []),
			...(semantics ? [{type: semanticPairs.type}] : []),
			...(neutrals ? [{type: neutral.type}] : [])
		];
	}
} satisfies GroupDef;
