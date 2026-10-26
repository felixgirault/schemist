import {parseColor} from '#lib/color/parsing.js';
import defs from '#lib/definitions/index.js';
import {expect, test} from 'vitest';
import type {IdentifiedNodeData, NodeOutput} from './tree';
import {changedArg, evaluateTree, withIds} from './tree';

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

test('evaluateTree skips hidden nodes but not their children', () => {
	const input: NodeOutput = {
		color: parseColor('#f00')[1]!,
		name: 'Red'
	};
	const outputs = evaluateTree(
		withIds(
			[
				{
					type: 's',
					token: 'Grey $',
					isHidden: true,
					args: {amount: 0},
					children: [
						{
							type: 'l',
							token: 'Dark $',
							args: {amount: 20}
						}
					]
				}
			],
			'n1'
		),
		input
	);

	const grey = defs.s.apply(input.color, {amount: 0});

	expect(outputs).toEqual({
		'n1.1': {
			color: defs.l.apply(grey, {amount: 20}),
			name: 'Dark Grey Red'
		}
	});
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
