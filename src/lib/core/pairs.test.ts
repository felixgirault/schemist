import {schemistToRgb} from '#lib/color/conversion.js';
import {parseColor} from '#lib/color/parsing.js';
import {expect, test} from 'vitest';
import {
	checkPair,
	expandRules,
	resolvePairs,
	resolveRoles,
	usesOf
} from './pairs';

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

test('resolves roles, reporting what does not resolve', () => {
	const {roles, errors} = resolveRoles(
		[
			{name: 'Text', colors: ['A', 'X', 'C']},
			{name: 'Text', colors: []},
			{name: 'Both', colors: ['B']}
		],
		colors
	);

	expect(roles).toEqual([
		{name: 'Text', colors: [colors[0], colors[3]]},
		{name: 'Both', colors: []}
	]);
	expect(errors.map(({index}) => index)).toEqual([0, 1, 2]);
});

const ids = ['a', 'b', 'c', 'd'];
const roles = [
	{name: 'Text', colors: ['a', 'b']},
	{name: 'Surfaces', colors: ['b', 'c', 'd']}
];

test('expands a rule to each fg on each bg, never on itself', () => {
	const {pairs, errors} = expandRules(
		roles,
		[{fg: 'Text', bg: 'Surfaces', use: 'body'}],
		[]
	);

	expect(errors).toEqual([]);
	expect(pairs.map(({fg, bg}) => fg + bg)).toEqual([
		'ab',
		'ac',
		'ad',
		'bc',
		'bd'
	]);
	expect(pairs[0]).toMatchObject({
		wcag2: 4.5,
		apca: 75,
		sources: {rules: [0], oneOff: false}
	});
});

test('expands a role among itself to unordered pairs', () => {
	const {pairs} = expandRules(
		[{name: 'Series', colors: ids}],
		[{fg: 'Series', use: 'categories'}],
		[]
	);

	expect(pairs).toHaveLength(6);
	expect(pairs[0]).toMatchObject({
		fg: 'a',
		bg: 'b',
		difference: 10
	});
});

test('combines overlapping rules with the strictest targets', () => {
	const {pairs} = expandRules(
		roles,
		[
			{fg: 'Text', bg: 'Surfaces', use: 'body'},
			{
				fg: 'Text',
				bg: 'Surfaces',
				use: 'large',
				difference: 5
			}
		],
		[]
	);

	expect(pairs[0]).toMatchObject({
		wcag2: 4.5,
		apca: 75,
		difference: 5,
		sources: {rules: [0, 1], oneOff: false}
	});
});

test('a one-off pair replaces what rules give its couple', () => {
	const {pairs} = expandRules(
		roles,
		[{fg: 'Text', bg: 'Surfaces', use: 'body'}],
		[
			{fg: 'a', bg: 'c', wcag2: 3},
			{fg: 'a', bg: 'z', wcag2: 3}
		]
	);
	const ac = pairs.find(({bg}) => bg === 'c')!;

	expect(pairs).toHaveLength(6);
	expect(ac.apca).toBeUndefined();
	expect(ac).toMatchObject({
		wcag2: 3,
		sources: {rules: [], oneOff: true}
	});
	expect(pairs.at(-1)).toMatchObject({bg: 'z'});
});

test('a one-off pair replaces a couple of a role among itself', () => {
	const {pairs} = expandRules(
		[{name: 'Series', colors: ['a', 'b']}],
		[{fg: 'Series', use: 'categories'}],
		[{fg: 'b', bg: 'a', difference: 20}]
	);

	expect(pairs).toEqual([
		{
			fg: 'b',
			bg: 'a',
			difference: 20,
			sources: {rules: [], oneOff: true}
		}
	]);
});

test('reports rules that do not hold, and keeps the others', () => {
	const {pairs, errors} = expandRules(
		roles,
		[
			{fg: 'Nope', bg: 'Surfaces', use: 'body'},
			{fg: 'Text', bg: 'Surfaces', use: 'nope'},
			{fg: 'Text', bg: 'Surfaces'},
			{fg: 'Text', bg: 'Surfaces', wcag2: 3}
		],
		[]
	);

	expect(
		errors.map(({index, field}) => [index, field])
	).toEqual([
		[0, 'fg'],
		[1, 'use'],
		[2, undefined]
	]);
	expect(pairs[0].sources.rules).toEqual([3]);
});
