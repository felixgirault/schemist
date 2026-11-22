import {schemistToRgb} from '#lib/color/conversion.js';
import {parseColor} from '#lib/color/parsing.js';
import {expect, test} from 'vitest';
import {checkPair, resolvePairs, usesOf} from './pairs';

const colors = [
	{name: 'A'},
	{name: 'B'},
	{name: 'B'},
	{name: 'C'}
];

test('resolves names to colors, in the given order', () => {
	const {pairs, errors} = resolvePairs(
		[
			{fg: 'C', bg: 'A', apca: 60},
			{fg: 'A', bg: 'C', wcag2: 4.5, difference: 10}
		],
		colors
	);

	expect(errors).toEqual([]);
	expect(pairs).toEqual([
		{fg: colors[3], bg: colors[0], apca: 60},
		{fg: colors[0], bg: colors[3], wcag2: 4.5, difference: 10}
	]);
});

test.each([
	[{fg: 'X', bg: 'A', wcag2: 3}, 'fg', 'unknown color "X"'],
	[{fg: 'A', bg: 'X', wcag2: 3}, 'bg', 'unknown color "X"'],
	[
		{fg: 'B', bg: 'A', wcag2: 3},
		'fg',
		'"B" names 2 colors, give them distinct tokens'
	],
	[
		{fg: 'A', bg: 'A', wcag2: 3},
		undefined,
		'a color is never combined with itself'
	],
	[
		{fg: 'A', bg: 'C'},
		undefined,
		'expected at least one target: wcag2, apca or difference'
	]
])('rejects %j', (pair, field, message) => {
	const {pairs, errors} = resolvePairs([pair], colors);

	expect(pairs).toEqual([]);
	expect(errors).toEqual([{index: 0, field, message}]);
});

test('accepts both orders of a couple, not the same twice', () => {
	const {pairs, errors} = resolvePairs(
		[
			{fg: 'A', bg: 'C', wcag2: 3},
			{fg: 'C', bg: 'A', wcag2: 3},
			{fg: 'A', bg: 'C', apca: 60}
		],
		colors
	);

	expect(pairs).toHaveLength(2);
	expect(errors).toEqual([
		{index: 2, field: undefined, message: 'declared twice'}
	]);
});

const rgb = (hex: string) => schemistToRgb(parseColor(hex)[1]!);

test('checks each target in the worst case', () => {
	const black = rgb('#000');
	const white = rgb('#fff');
	const [wcag2, difference] = checkPair(
		{wcag2: 21, difference: 200},
		black,
		white,
		['protanomaly']
	);

	expect(wcag2).toMatchObject({target: 'wcag2', pass: true});
	expect(wcag2.simulated).toHaveLength(1);
	expect(difference).toMatchObject({
		target: 'difference',
		pass: false
	});
});

test('infers the uses of a pair from its targets', () => {
	const names = (pair: Parameters<typeof usesOf>[0]) => {
		const {uses, custom} = usesOf(pair);
		return [
			...uses.map(({id}) => id),
			...(custom ? ['custom'] : [])
		];
	};

	expect(names({wcag2: 4.5, apca: 75})).toEqual(['body']);
	expect(names({wcag2: 3, difference: 10})).toEqual([
		'large',
		'categories'
	]);
	// leftover targets are Custom
	expect(names({wcag2: 4.5})).toEqual(['custom']);
	expect(names({wcag2: 3, apca: 60})).toEqual([
		'large',
		'custom'
	]);
});
