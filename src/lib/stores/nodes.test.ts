import {parseColor} from '#lib/color/parsing.js';
import defs from '#lib/definitions/nodes/index.js';
import {parseTree} from '#lib/presets.js';
import {expect, test} from 'vitest';
import type {NodeOutput} from './nodes.svelte';
import {
	collectOutputs,
	evaluateTree,
	remapArgs,
	withIds
} from './nodes.svelte';

test('setType keeps the node and its subtree', () => {
	const tree = parseTree({
		type: 'clr',
		children: [
			{
				type: 'l',
				token: 'Dark $',
				isHidden: true,
				children: [{type: 'cmp'}]
			}
		]
	});

	const [node] = tree.children;
	const [child] = node.children;
	const {id} = node;

	node.setType('hlt');

	expect(node.def).toBe(defs.hlt);
	expect(node.id).toBe(id);
	expect(node.token).toBe('Dark $');
	expect(node.isHidden).toBe(true);
	expect(node.parent).toBe(tree);
	expect(node.children).toEqual([child]);
	expect(tree.children).toEqual([node]);
});

test('setType updates the output', () => {
	const tree = parseTree({
		type: 'clr',
		children: [{type: 'l', args: {amount: 20}}]
	});

	const [node] = tree.children;
	node.setType('s');

	expect(node.output[0]).toEqual(
		defs.s.apply(tree.output[0], {amount: 20})
	);
});

test('keeps args of identical params', () => {
	expect(
		remapArgs(defs.hlt, defs.sdw, {
			amount: 30,
			shift: 5,
			temp: 600
		})
	).toEqual({amount: 30, shift: 5, temp: 600});

	expect(remapArgs(defs.l, defs.s, {amount: 20})).toEqual({
		amount: 20
	});
});

test('resets args of params with another range or kind', () => {
	// Same name, but 0-100 instead of 0-50.
	expect(remapArgs(defs.l, defs.hlt, {amount: 80})).toEqual({
		amount: 10,
		shift: 15,
		temp: 650
	});

	expect(remapArgs(defs.h, defs.anl, {degrees: 90})).toEqual({
		steps: 1
	});

	expect(remapArgs(defs.l, defs.cmp, {amount: 80})).toEqual({});
});

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
	const input: NodeOutput = [parseColor('#f00')[1]!, 'Red'];
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

	const grey = defs.s.apply(input[0], {amount: 0});

	expect(outputs).toEqual({
		'n1.1': [defs.l.apply(grey, {amount: 20}), 'Dark Grey Red']
	});
});

test('presets output their generated colors', () => {
	const tree = parseTree({
		type: 'clr',
		token: 'Brand',
		children: [{type: 'lsc', args: {steps: 3}}]
	});

	const [preset] = tree.children;
	const outputs = collectOutputs(tree);

	expect(Object.keys(outputs)).toEqual([
		tree.id,
		`${preset.id}.0`,
		`${preset.id}.1`,
		`${preset.id}.2`
	]);

	expect(outputs[`${preset.id}.1`][0]).toEqual(
		defs.l.apply(tree.output[0], {amount: 50})
	);

	preset.args.steps = 2;
	expect(Object.keys(collectOutputs(tree))).toHaveLength(3);

	preset.isHidden = true;
	expect(Object.keys(collectOutputs(tree))).toEqual([tree.id]);
});

test('presets lend their name to their colors', () => {
	const tree = parseTree({
		type: 'clr',
		token: 'Brand',
		children: [
			{type: 'hrm', args: {tetrad: false, triad: false}}
		]
	});

	const [preset] = tree.children;
	const names = () =>
		Object.values(preset.generated).map(([, name]) => name);

	expect(names()).toEqual([
		'Left Brand complementary',
		'Right Brand complementary'
	]);

	preset.token = 'Accent';
	expect(names()).toEqual([
		'Left Accent complementary',
		'Right Accent complementary'
	]);
});

test('presets drop children', () => {
	const tree = parseTree({
		type: 'lsc',
		children: [{type: 'l'}]
	});

	expect(tree.children).toEqual([]);
});
