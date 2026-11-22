import {formatSchemistToHex} from '#lib/color/formatting.js';
import type {NodeData} from '#lib/core/nodes.js';
import presets from '#lib/definitions/presets/index.js';
import {collectOutputs} from '#lib/stores/nodes.svelte.js';
import {rootTree} from '#lib/testing/tree.js';
import {parseTree} from '#lib/tree.js';
import {expect, test} from 'vitest';
import {evaluate} from './evaluate';

const viaStore = (tree: NodeData) =>
	Object.values(collectOutputs(parseTree(tree))).map(
		({color, name}) => [formatSchemistToHex(color), name]
	);

const viaCore = (tree: NodeData) =>
	evaluate(tree).map(({color, name}) => [
		formatSchemistToHex(color),
		name
	]);

test.each(
	Object.values(presets).flatMap((preset) =>
		['#ff0000', '#3b82f6', '#808080'].map((hex) => ({
			preset,
			hex
		}))
	)
)(
	'evaluate matches the store for $preset.label under $hex',
	({preset, hex}) => {
		const tree = rootTree(hex, preset.nodes);
		expect(viaCore(tree)).toEqual(viaStore(tree));
	}
);

test('evaluate keeps visiting children of hidden nodes', () => {
	const tree = rootTree('#3b82f6', [
		{
			type: 'cmp',
			isHidden: true,
			children: [{type: 'anl', token: 'Child $'}]
		}
	]);

	expect(evaluate(tree)).toHaveLength(2);
	expect(viaCore(tree)).toEqual(viaStore(tree));
});

test('evaluate ids are depth-first indexes', () => {
	const tree = rootTree('#3b82f6', [
		{type: 'cmp', isHidden: true, children: [{type: 'h'}]},
		{type: 'h'}
	]);

	expect(evaluate(tree).map(({id}) => id)).toEqual([
		'0',
		'2',
		'3'
	]);
});
