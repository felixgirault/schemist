import {definePreset} from '#lib/core/nodes.js';
import triadLeft from '#lib/definitions/nodes/triadLeft.js';
import triadRight from '#lib/definitions/nodes/triadRight.js';
import neutral from './neutral';
import semanticPairs from './semanticPairs';
import states from './states';

export default definePreset({
	type: 'sch',
	label: 'Schemist theme',
	description: 'Accents, semantic colors and neutrals',
	params: [
		{
			type: 'boolean',
			name: 'secondary',
			isStructural: true,
			label: 'Secondary',
			default: true
		},
		{
			type: 'boolean',
			name: 'tertiary',
			isStructural: true,
			label: 'Tertiary',
			default: true
		},
		{
			type: 'boolean',
			name: 'semantics',
			isStructural: true,
			label: 'Semantic colors',
			default: true
		},
		{
			type: 'boolean',
			name: 'neutrals',
			isStructural: true,
			label: 'Neutrals',
			default: true
		}
	],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	// States, semantic pairs and neutrals are presets of their own,
	// which can be expanded in turn.
	build({secondary, tertiary, semantics, neutrals}) {
		return [
			...(secondary
				? [
						{
							type: triadLeft.type,
							token: 'Secondary',
							children: [{type: states.type}]
						}
					]
				: []),
			...(tertiary
				? [
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
});
