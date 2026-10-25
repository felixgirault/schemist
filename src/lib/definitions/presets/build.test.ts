import {parseColor} from '#lib/color/parsing.js';
import {presetSamples} from '#lib/samples.js';
import {expect, test} from 'vitest';

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
