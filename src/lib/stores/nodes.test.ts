import defs from '#lib/definitions/nodes/index.js';
import {parseTree} from '#lib/presets.js';
import {expect, test} from 'vitest';
import {remapArgs} from './nodes.svelte';

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
