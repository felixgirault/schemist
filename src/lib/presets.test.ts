import {pack, unpack} from '#lib/packing/index.js';
import type {Node} from '#lib/stores/nodes.svelte.js';
import {expect, test} from 'vitest';
import type {PresetNode} from './presets';
import {changedArg, parseTree, serializeTree} from './presets';

test('serialized trees are restored with the same ids', () => {
	const tree = parseTree({
		type: 'clr',
		children: [
			{
				type: 'l',
				token: 'Dark $',
				isHidden: true,
				args: {amount: 20}
			}
		]
	});

	const restored = parseTree(serializeTree(tree));

	expect(serializeTree(restored)).toEqual(serializeTree(tree));
	expect(restored.children[0].id).toBe(tree.children[0].id);
});

// Serialized trees share their args with the live tree.
const snapshot = (tree: Node) =>
	JSON.parse(JSON.stringify(serializeTree(tree))) as PresetNode;

test('names the only arg changed between two trees', () => {
	const tree = parseTree({
		type: 'clr',
		children: [{type: 'l'}, {type: 'h'}]
	});

	const previous = snapshot(tree);
	const [lightness, hue] = tree.children;
	lightness.args.amount = 20;

	expect(changedArg(previous, snapshot(tree))).toBe(
		`${lightness.id}.amount`
	);

	hue.args.degrees = 20;
	expect(changedArg(previous, snapshot(tree))).toBeUndefined();
});

test('names no arg when anything else changed', () => {
	const tree = parseTree({
		type: 'clr',
		children: [{type: 'l'}]
	});
	const previous = snapshot(tree);
	const [child] = tree.children;

	child.args.amount = 20;
	child.isHidden = true;
	expect(changedArg(previous, snapshot(tree))).toBeUndefined();

	child.isHidden = false;
	child.token = 'Dark';
	expect(changedArg(previous, snapshot(tree))).toBeUndefined();

	child.token = '';
	tree.addChild(parseTree({type: 'l'}));
	expect(changedArg(previous, snapshot(tree))).toBeUndefined();
});

test('starts a new step when a type changes', () => {
	const tree = parseTree({
		type: 'clr',
		children: [{type: 'hlt'}]
	});
	const previous = snapshot(tree);

	// Same args, only the type changes.
	tree.children[0].setType('sdw');
	expect(changedArg(previous, snapshot(tree))).toBeUndefined();
});

test('keeps changed types in permalinks', () => {
	const tree = parseTree({
		type: 'clr',
		children: [{type: 'l', children: [{type: 'cmp'}]}]
	});

	tree.children[0].setType('s');

	const [child] = unpack(pack(snapshot(tree))).children!;
	expect(child.type).toBe('s');
	expect(child.args).toEqual({amount: 50});
	expect(child.children).toHaveLength(1);
});
