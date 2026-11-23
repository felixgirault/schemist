import {formatSchemistToHex} from '#lib/color/formatting.js';
import type {SchemistColor} from '#lib/color/types.js';
import {expect, test} from 'vitest';
import {parseTreeJson} from './tree.js';

const parse = (tree: unknown) =>
	parseTreeJson(JSON.stringify(tree));

test('converts color strings and keeps the rest', () => {
	const tree = parse({
		type: 'clr',
		args: {color: 'rgb(59, 130, 246)'},
		children: [
			{type: 'ctr', token: 'Text', args: {amount: 50}}
		]
	});

	expect(
		formatSchemistToHex(tree.args!.color as SchemistColor)
	).toBe('#3b82f6');
	expect(tree.children).toEqual([
		{type: 'ctr', token: 'Text', args: {amount: 50}}
	]);
});

test.each([
	['{', 'invalid JSON'],
	['[]', 'root: expected an object'],
	[{type: 'nope'}, 'root.type: unknown node type "nope"'],
	[{type: 'clr', extra: 1}, 'root: unknown key "extra"'],
	[
		{type: 'clr', children: [{type: 'cmp'}, {type: 'x'}]},
		'root.children[1].type: unknown node type "x"'
	],
	[
		{type: 'ctr', args: {nope: 1}},
		'root.args.nope: unknown param for type "ctr"'
	],
	[
		{type: 'ctr', args: {amount: 101}},
		'root.args.amount: expected an integer between 0 and 100'
	],
	[
		{type: 'ctr', args: {amount: '50'}},
		'root.args.amount: expected an integer'
	],
	[
		{type: 'l', args: {amount: 33.3}},
		'root.args.amount: expected an integer between 0 and 100'
	],
	[
		{type: 'stt', children: [{type: 'cmp'}]},
		'root.children: a preset ("stt") can\'t have children'
	],
	[
		{type: 'clr', args: {color: 'blue-ish'}},
		'root.args.color: expected a CSS color string'
	],
	[
		{type: 'clr', args: {color: 12}},
		'root.args.color: expected'
	],
	[
		{type: 'cmp', isHidden: 'yes'},
		'root.isHidden: expected a boolean'
	],
	[{type: 'cmp', token: 1}, 'root.token: expected a string'],
	[
		{type: 'cmp', children: {}},
		'root.children: expected an array'
	],
	[
		{type: 'cmp', children: [{type: 'cmp', pairs: []}]},
		'root.children[0]: unknown key "pairs"'
	],
	[{type: 'cmp', pairs: {}}, 'root.pairs: expected an array'],
	[
		{type: 'cmp', pairs: [{fg: 'a', bg: 'b', x: 1}]},
		'root.pairs[0]: unknown key "x"'
	],
	[
		{type: 'cmp', pairs: [{fg: 1, bg: 'b', wcag2: 3}]},
		'root.pairs[0].fg: expected a string'
	],
	[
		{type: 'cmp', pairs: [{fg: 'a', bg: 'b', apca: '60'}]},
		'root.pairs[0].apca: expected a number'
	],
	[
		{
			type: 'clr',
			token: 'Bg',
			children: [{type: 'cmp', token: 'Text'}],
			pairs: [
				{fg: 'Text', bg: 'Bg', wcag2: 3},
				{fg: 'Txt', bg: 'Bg', wcag2: 3}
			]
		},
		'root.pairs[1].fg: unknown color "Txt"'
	],
	[
		{
			type: 'clr',
			token: 'Bg',
			children: [{type: 'cmp', token: 'Text'}],
			pairs: [{fg: 'Text', bg: 'Bg'}]
		},
		'root.pairs[0]: expected at least one target'
	]
])('rejects %j', (tree, message) => {
	expect(() =>
		parseTreeJson(
			typeof tree === 'string' ? tree : JSON.stringify(tree)
		)
	).toThrow(message);
});

test('fills missing args with the defaults', () => {
	expect(parse({type: 'hlt', args: {amount: 20}}).args).toEqual(
		{amount: 20, shift: 15, temp: 650}
	);
});

test('accepts tokens with the separators of permalinks', () => {
	expect(parse({type: 'cmp', token: 'a, b@c'}).token).toBe(
		'a, b@c'
	);
});

test('keeps the pairs of the root, naming hidden colors too', () => {
	const pairs = [{fg: 'Text', bg: 'Bg', wcag2: 4.5, apca: 60}];

	expect(
		parse({
			type: 'clr',
			token: 'Bg',
			children: [
				{type: 'cmp', token: 'Text', isHidden: true}
			],
			pairs
		}).pairs
	).toEqual(pairs);
});

test('rejects an override of a structural param', () => {
	expect(() =>
		parse({
			type: 'clr',
			variants: ['Light', 'Dark'],
			children: [{type: 'lsc', overrides: {Dark: {steps: 3}}}]
		})
	).toThrow('root.children[0].overrides.Dark.steps');
});
