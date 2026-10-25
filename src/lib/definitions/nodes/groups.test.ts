import {parseColor} from '#lib/color/parsing.js';
import type {PresetNode} from '#lib/presets.js';
import {presetSamples} from '#lib/samples.js';
import {range} from '#lib/utils/generators.js';
import {expect, test} from 'vitest';

// Static presets that groups replaced, see ADR 4.
const replaced: [type: string, nodes: PresetNode[]][] = [
	[
		'lsc',
		// Without the black and white ends.
		range(9).map((i) => ({
			type: 'l',
			args: {amount: (i + 1) * 10}
		}))
	],
	[
		'ntl',
		[
			{
				type: 's',
				isHidden: true,
				token: 'Desaturated $',
				args: {amount: 5},
				children: [
					['Neutral white', 98],
					['Neutral light', 85],
					['Neutral', 50],
					['Neutral dark', 15],
					['Neutral black', 2]
				].map(([token, amount]) => ({
					type: 'l',
					token: token as string,
					args: {amount}
				}))
			}
		]
	],
	[
		'rnb',
		range(11).map((i) => ({type: 'anl', args: {steps: i + 1}}))
	],
	[
		'hrm',
		[
			{type: 'ttl', token: 'Left $ tetrad'},
			{type: 'trl', token: 'Left $ triad'},
			{type: 'scl', token: 'Left $ complementary'},
			{type: 'scr', token: 'Right $ complementary'},
			{type: 'trr', token: 'Right $ triad'},
			{type: 'ttr', token: 'Right $ tetrad'}
		]
	]
];

test.each(replaced)(
	'group %s yields the colors of the preset it replaced',
	(type, nodes) => {
		const color = parseColor('#c93')[1]!;

		expect(presetSamples([{type}], color)).toEqual(
			presetSamples(nodes, color)
		);
	}
);

test('scales spread their steps between black and white', () => {
	const color = parseColor('#c93')[1]!;

	expect(
		presetSamples([{type: 'lsc', args: {steps: 3}}], color)
	).toEqual(
		presetSamples(
			[25, 50, 75].map((amount) => ({
				type: 'l',
				args: {amount}
			})),
			color
		)
	);
});

test('neutrals follow the saturation amount', () => {
	const color = parseColor('#c93')[1]!;
	const desaturated = presetSamples(
		[{type: 's', args: {amount: 30}}],
		color
	)[0];

	expect(
		presetSamples([{type: 'ntl', args: {amount: 30}}], color)
	).toEqual(
		presetSamples(
			[98, 85, 50, 15, 2].map((amount) => ({
				type: 'l',
				args: {amount}
			})),
			desaturated
		)
	);
});

test('schemist theme sections can be left out', () => {
	const color = parseColor('#c93')[1]!;
	const sample = (args: Record<string, boolean>) =>
		presetSamples([{type: 'sch', args}], color);

	expect(sample({accents: false, semantics: false})).toEqual(
		presetSamples([{type: 'ntl'}], color)
	);

	expect(sample({semantics: false, neutrals: false})).toEqual(
		presetSamples(
			[
				{type: 'trl', children: [{type: 'stt'}]},
				{type: 'trr', children: [{type: 'stt'}]}
			],
			color
		)
	);
});
