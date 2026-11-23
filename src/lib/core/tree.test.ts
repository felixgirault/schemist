import {expect, test} from 'vitest';
import type {IdentifiedNodeData} from './nodes';
import {
	changedArg,
	validateTree,
	withIds,
	withOverrides
} from './tree';

test('withIds numbers template nodes depth-first', () => {
	expect(
		withIds(
			[
				{type: 's', children: [{type: 'l'}, {type: 'l'}]},
				{type: 'h'}
			],
			'n1'
		)
	).toEqual([
		{
			type: 's',
			id: 'n1.0',
			children: [
				{type: 'l', id: 'n1.1'},
				{type: 'l', id: 'n1.2'}
			]
		},
		{type: 'h', id: 'n1.3'}
	]);
});

// A color with a lightness and a hue child, as serialized.
const tree = (
	lightness: Partial<IdentifiedNodeData> = {},
	hue: Partial<IdentifiedNodeData> = {}
): IdentifiedNodeData => ({
	id: 'n1',
	type: 'clr',
	children: [
		{id: 'n2', type: 'l', args: {amount: 50}, ...lightness},
		{id: 'n3', type: 'h', args: {degrees: 180}, ...hue}
	]
});

test('names the only arg changed between two trees', () => {
	expect(changedArg(tree(), tree({args: {amount: 20}}))).toBe(
		'n2.amount'
	);

	expect(
		changedArg(
			tree(),
			tree({args: {amount: 20}}, {args: {degrees: 20}})
		)
	).toBeUndefined();
});

test('names no arg when anything else changed', () => {
	const args = {amount: 20};

	expect(
		changedArg(tree(), tree({args, isHidden: true}))
	).toBeUndefined();

	expect(
		changedArg(tree(), tree({args, token: 'Dark'}))
	).toBeUndefined();

	expect(
		changedArg(
			tree(),
			tree({args, children: [{id: 'n4', type: 'l'}]})
		)
	).toBeUndefined();
});

test('names no arg when overrides changed', () => {
	expect(
		changedArg(
			tree(),
			tree({
				args: {amount: 20},
				overrides: {Dark: {amount: 5}}
			})
		)
	).toBeUndefined();
});

test('names no arg when a type changes', () => {
	// Would name the arg if types were not compared.
	expect(
		changedArg(
			tree({type: 'l'}),
			tree({type: 's', args: {amount: 20}})
		)
	).toBeUndefined();
});

test('validates roles and rules of the root only', () => {
	const roles = [{name: 'Text', colors: ['A']}];
	const rules = [{fg: 'Text', use: 'categories', wcag2: 3}];

	expect(
		validateTree({type: 'clr', roles, rules}, 'root', true)
	).toMatchObject({roles, rules});
	expect(() =>
		validateTree({type: 'clr', roles}, 'root')
	).toThrow('unknown key "roles"');
});

test.each([
	[{roles: [{name: '', colors: []}]}, 'expected a name'],
	[{roles: [{name: 'A', colors: [1]}]}, 'expected color names'],
	[{rules: [{fg: 'A', use: 'nope'}]}, 'rules[0].use'],
	[{rules: [{fg: 'A', bg: 'B'}]}, 'expected a use or at least'],
	[{rules: [{fg: 'A', use: 'body', x: 1}]}, 'unknown key "x"']
])('rejects %j', (data, message) => {
	expect(() =>
		validateTree({type: 'clr', ...data}, 'root', true)
	).toThrow(message);
});

const variantRoot = (
	child: object,
	variants = ['Light', 'Dark']
) => ({
	type: 'clr',
	variants,
	children: [child]
});

test('validates variants and overrides', () => {
	const tree = validateTree(
		variantRoot({type: 'l', overrides: {Dark: {amount: 20}}}),
		'root',
		true
	);

	expect(tree.variants).toEqual(['Light', 'Dark']);
	expect(tree.children![0].overrides).toEqual({
		Dark: {amount: 20}
	});
});

test.each([
	[
		{type: 'l', overrides: {Night: {amount: 20}}},
		'not declared'
	],
	[
		{type: 'l', overrides: {Light: {amount: 20}}},
		'base variant'
	],
	[{type: 'l', overrides: {Dark: {nope: 20}}}, 'unknown param'],
	[
		{type: 'l', overrides: {Dark: {amount: 200}}},
		'between 0 and 100'
	],
	[{type: 'lsc', overrides: {Dark: {steps: 3}}}, 'structure']
])('rejects override %j', (child, message) => {
	expect(() =>
		validateTree(variantRoot(child), 'root', true)
	).toThrow(message);
});

test('rejects bad variants, and overrides without any', () => {
	expect(() =>
		validateTree(
			variantRoot({type: 'l'}, ['A', 'A']),
			'root',
			true
		)
	).toThrow('named twice');
	expect(() =>
		validateTree(variantRoot({type: 'l'}, []), 'root', true)
	).toThrow('expected variant names');
	expect(() =>
		validateTree(
			{
				type: 'clr',
				children: [{type: 'l', overrides: {Dark: {}}}]
			},
			'root',
			true
		)
	).toThrow('not declared');
	expect(() =>
		validateTree({type: 'l', variants: ['A']}, 'root')
	).toThrow('unknown key "variants"');
});

test('withOverrides keeps the args each variant builds differently', () => {
	expect(
		withOverrides(
			withIds(
				[
					{
						type: 'hlt',
						args: {amount: 10},
						children: [{type: 'l', args: {amount: 5}}]
					}
				],
				'n'
			),
			{
				Dark: [
					{
						type: 'hlt',
						args: {amount: 30},
						children: [{type: 'l', args: {amount: 5}}]
					}
				]
			}
		)
	).toEqual([
		{
			id: 'n.0',
			type: 'hlt',
			args: {amount: 10},
			overrides: {Dark: {amount: 30}},
			children: [{id: 'n.1', type: 'l', args: {amount: 5}}]
		}
	]);
});
