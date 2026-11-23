import {formatSchemistToHex} from '#lib/color/formatting.js';
import {evaluate} from '#lib/core/evaluate.js';
import type {IdentifiedNodeData} from '#lib/core/nodes.js';
import {changedArg} from '#lib/core/tree.js';
import defs from '#lib/definitions/index.js';
import {pack, unpack} from '#lib/packing/index.js';
import {
	collectOutputs,
	createNode
} from '#lib/stores/nodes.svelte.js';
import {rootTree} from '#lib/testing/tree.js';
import {
	expandPreset,
	parseTree,
	parseVariants,
	serializeTree,
	withVariantIds
} from '#lib/tree.js';
import {History} from '#lib/utils/history.svelte.js';
import {expect, test} from 'vitest';

const hexes = (node: ReturnType<typeof parseTree>) =>
	Object.values(collectOutputs(node)).map(({color}) =>
		formatSchemistToHex(color)
	);

test('the colors of a preset follow its args', () => {
	const root = parseTree(
		rootTree('#3b82f6', [{type: 'lsc', args: {steps: 2}}])
	);
	const preset = root.children[0];

	expect(Object.keys(preset.generated)).toEqual([
		`${preset.id}.0`,
		`${preset.id}.1`
	]);

	preset.args.steps = 4;
	expect(Object.keys(preset.generated)).toHaveLength(4);
});

test('hiding a preset hides its colors', () => {
	const root = parseTree(rootTree('#3b82f6', [{type: 'stt'}]));

	expect(Object.keys(collectOutputs(root))).toHaveLength(3);

	root.children[0].isHidden = true;
	expect(Object.keys(collectOutputs(root))).toHaveLength(1);
});

test('presets refuse children and drop them when parsed', () => {
	const preset = createNode('stt');

	expect(() => preset.addChild(createNode('cmp'))).toThrow(
		"can't have children"
	);
	expect(
		parseTree({type: 'stt', children: [{type: 'cmp'}]})
			.children
	).toHaveLength(0);
});

test('a preset round trips through serialization', () => {
	const tree = rootTree('#3b82f6', [
		{type: 'lsc', token: 'Step', args: {steps: 5}}
	]);

	expect(serializeTree(parseTree(tree)).children).toEqual([
		{
			id: expect.any(String),
			type: 'lsc',
			isHidden: false,
			token: 'Step',
			args: {steps: 5}
		}
	]);
});

test('expanding replaces a preset in place, keeping ids', () => {
	const root = parseTree(
		rootTree('#3b82f6', [
			{type: 'cmp'},
			{type: 'stt', token: 'Brand'},
			{type: 'h'}
		])
	);
	const preset = root.children[1];
	const before = collectOutputs(root);

	expandPreset(preset);

	expect(root.children.map(({def}) => def.type)).toEqual([
		'cmp',
		'hlt',
		'sdw',
		'h'
	]);
	expect(Object.keys(collectOutputs(root))).toEqual(
		Object.keys(before)
	);
	expect(hexes(root)).toEqual(
		Object.values(before).map(({color}) =>
			formatSchemistToHex(color)
		)
	);
	expect(root.children[1].parent).toBe(root);
	expect(preset.parent).toBeUndefined();
});

test('expanding keeps a hidden preset hidden and its names', () => {
	const root = parseTree(
		rootTree('#3b82f6', [
			{type: 'stt', token: 'Brand', isHidden: true}
		])
	);

	expandPreset(root.children[0]);

	expect(root.children.map(({isHidden}) => isHidden)).toEqual([
		true,
		true
	]);
	expect(root.children.map(({token}) => token)).toEqual([
		'Brand light',
		'Brand dark'
	]);
});

test('collectOutputs matches evaluate for expanded presets', () => {
	const tree = rootTree('#3b82f6', [{type: 'sch'}]);
	const root = parseTree(tree);

	root.children.forEach(expandPreset);

	expect(hexes(root)).toEqual(
		evaluate(tree).map(({color}) => formatSchemistToHex(color))
	);
});

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

test('setType refuses to make a preset of a node with children', () => {
	const [node] = parseTree({
		type: 'clr',
		children: [{type: 'l', children: [{type: 'cmp'}]}]
	}).children;

	expect(() => node.setType('stt')).toThrow('children');
	expect(node.def).toBe(defs.l);
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

test('a swap is one undo step that survives packing', () => {
	const tree = parseTree({
		type: 'clr',
		children: [{type: 'l', args: {amount: 20}}]
	});

	let restored = tree;
	const history = new History<IdentifiedNodeData>({
		restore: (snapshot) => {
			restored = parseTree(unpack(pack(snapshot)));
		},
		group: changedArg
	});

	history.reset(serializeTree(tree));
	tree.children[0].setType('s');
	history.record(serializeTree(tree));
	expect(history.past).toHaveLength(1);

	history.undo();
	expect(restored.children[0].def.type).toBe('l');
	expect(restored.children[0].args).toEqual({amount: 20});
});

test('a swap keeps the overrides of the params both types have', () => {
	const root = parseTree(
		rootTree('#3b82f6', [
			{type: 'hlt', overrides: {v1: {amount: 30, shift: 5}}}
		])
	);
	const [node] = root.children;

	node.setType('sdw');
	expect(node.overrides).toEqual({v1: {amount: 30, shift: 5}});

	node.setType('cmp');
	expect(node.overrides).toEqual({});
});

test('expanding a preset gives each color the args its variants differ by', () => {
	const root = parseTree(
		rootTree('#3b82f6', [
			{
				type: 'stt',
				token: 'Brand',
				overrides: {v1: {amount: 30}}
			}
		])
	);
	const colorsIn = (variant: string) =>
		evaluate(
			{...serializeTree(root), variants: ['Light', variant]},
			false,
			variant
		).map(({color}) => formatSchemistToHex(color));
	const before = [colorsIn('v1'), hexes(root)];

	expandPreset(root.children[0]);

	expect(root.children.map(({overrides}) => overrides)).toEqual(
		[{v1: {amount: 30}}, {v1: {amount: 30}}]
	);
	expect([colorsIn('v1'), hexes(root)]).toEqual(before);
});

test('variants are saved by name and loaded by id', () => {
	const data = {
		...rootTree('#3b82f6', [
			{type: 'l', overrides: {Dark: {amount: 20}}}
		]),
		variants: ['Light', 'Dark']
	};
	const variants = parseVariants(data);
	const root = parseTree(withVariantIds(data, variants));

	expect(Object.keys(root.children[0].overrides)).toEqual([
		variants[1].id
	]);
	expect(
		serializeTree(
			root,
			undefined,
			undefined,
			undefined,
			variants
		)
	).toMatchObject(data);
});
