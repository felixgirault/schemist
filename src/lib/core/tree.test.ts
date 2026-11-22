import {expect, test} from 'vitest';
import type {IdentifiedNodeData} from './nodes';
import {changedArg, validateTree, withIds} from './tree';

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
