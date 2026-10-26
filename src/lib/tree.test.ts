import {pack, unpack} from '#lib/packing/index.js';
import type {Node} from '#lib/stores/nodes.svelte.js';
import {collectOutputs} from '#lib/stores/nodes.svelte.js';
import {expect, test} from 'vitest';
import type {NodeData} from './tree';
import {
	changedArg,
	parseTree,
	serializeTree,
	expandPreset
} from './tree';

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
	JSON.parse(JSON.stringify(serializeTree(tree))) as NodeData;

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

test('a preset arg change can merge with the next one', () => {
	const tree = parseTree({
		type: 'clr',
		children: [{type: 'lsc'}]
	});
	const previous = snapshot(tree);
	const [preset] = tree.children;

	preset.args.steps = 5;
	expect(changedArg(previous, snapshot(tree))).toBe(
		`${preset.id}.steps`
	);
});

test('expandPreset puts the generated nodes in place of the preset', () => {
	const tree = parseTree({
		type: 'clr',
		children: [
			{type: 'l'},
			{type: 'lsc', args: {steps: 3}},
			{type: 'h'}
		]
	});
	const [first, preset, last] = tree.children;
	const outputs = collectOutputs(tree);
	const previous = snapshot(tree);

	expandPreset(preset);

	expect(tree.children.map(({id}) => id)).toEqual([
		first.id,
		`${preset.id}.0`,
		`${preset.id}.1`,
		`${preset.id}.2`,
		last.id
	]);

	expect(tree.children[1].parent).toBe(tree);
	expect(preset.parent).toBeUndefined();
	expect(collectOutputs(tree)).toEqual(outputs);

	// Structural change, so it is a step of its own.
	expect(changedArg(previous, snapshot(tree))).toBeUndefined();
});

test('expandPreset keeps the name and visibility of the preset', () => {
	const tree = parseTree({
		type: 'clr',
		token: 'Brand',
		children: [
			{
				type: 'hrm',
				token: 'Accent',
				isHidden: true,
				args: {tetrad: false, triad: false}
			}
		]
	});

	expandPreset(tree.children[0]);

	expect(
		tree.children.map(({token, isHidden}) => [token, isHidden])
	).toEqual([
		['Left Accent complementary', true],
		['Right Accent complementary', true]
	]);
});

test('expandPreset ignores other nodes', () => {
	const tree = parseTree({
		type: 'lsc',
		children: [{type: 'l'}]
	});

	expandPreset(tree);
	expect(tree.def.type).toBe('lsc');
});

test('expandPreset turns nested presets into presets', () => {
	const tree = parseTree({
		type: 'clr',
		children: [{type: 'mal'}]
	});
	const outputs = collectOutputs(tree);

	expandPreset(tree.children[0]);

	const [primary] = tree.children;
	expect(primary.children.map(({def}) => def.type)).toEqual([
		'mtl',
		'cmp',
		'neg',
		'mnl'
	]);

	// Nested colors keep their ids, e.g. `n1.1.0`.
	expect(collectOutputs(tree)).toEqual(outputs);
});
