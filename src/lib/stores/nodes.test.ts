import defs from '#lib/definitions/nodes/index.js';
import type {IdentifiedNodeData} from '#lib/model/tree.js';
import {
	changedArg,
	defaultInput,
	evaluateTree
} from '#lib/model/tree.js';
import {pack, unpack} from '#lib/packing/index.js';
import {expect, test} from 'vitest';
import type {Node} from './nodes.svelte';
import {
	collectOutputs,
	createNode,
	expandPreset,
	parseTree,
	serializeTree
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

	expect(node.output.color).toEqual(
		defs.s.apply(tree.output.color, {amount: 20})
	);
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

	expect(outputs[`${preset.id}.1`].color).toEqual(
		defs.l.apply(tree.output.color, {amount: 50})
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
		Object.values(preset.generated).map(({name}) => name);

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

test('presets refuse children', () => {
	const preset = createNode('lsc');
	expect(() => preset.addChild(createNode('l'))).toThrow();
	expect(preset.children).toEqual([]);

	const parent = parseTree({
		type: 'clr',
		children: [{type: 'l'}]
	});
	expect(() => parent.setType('lsc')).toThrow();
	expect(parent.def).toBe(defs.clr);
});

// Outputs are computed both on live nodes and on serialized
// trees, which must agree.
test('collectOutputs matches evaluateTree', () => {
	const tree = parseTree({
		type: 'clr',
		token: 'Brand',
		children: [
			{
				type: 'l',
				token: 'Dark $',
				isHidden: true,
				args: {amount: 20},
				children: [{type: 'cmp'}]
			},
			{type: 'lsc', args: {steps: 3}},
			{type: 'hrm', isHidden: true},
			{type: 'sch', token: 'Theme'}
		]
	});

	// Entries, so that the order is compared too.
	const outputs = Object.entries(collectOutputs(tree));

	expect(outputs.length).toBeGreaterThan(10);
	expect(outputs).toEqual(
		Object.entries(
			evaluateTree([serializeTree(tree)], defaultInput)
		)
	);
});

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
	JSON.parse(
		JSON.stringify(serializeTree(tree))
	) as IdentifiedNodeData;

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
