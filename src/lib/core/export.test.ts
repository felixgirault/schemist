import {evaluate} from '#lib/core/evaluate.js';
import {exportTokens} from '#lib/core/export.js';
import type {PresetNode} from '#lib/core/nodes.js';
import {rootTree} from '#lib/testing/tree.js';
import {expect, test} from 'vitest';

const named = (token: string, hex: string): PresetNode => ({
	type: 'clr',
	token,
	args: {color: rootTree(hex, []).args.color}
});

// Tokens under `Colors`, without the root, which has a generated name.
const tokens = (...nodes: PresetNode[]) => {
	const {Colors} = JSON.parse(
		exportTokens(
			evaluate(rootTree('#3b82f6', nodes)).slice(1),
			'https://schemist.test'
		)
	);
	delete Colors.$description;
	return Colors;
};

// These characterize the flat output before names are nested.

test('tokens keep slashes in the key', () => {
	const colors = tokens(named('button/primary/bg', '#ff0000'));
	expect(Object.keys(colors)).toEqual(['button/primary/bg']);
	expect(colors).toMatchSnapshot();
});

test('tokens keep dots in the key', () => {
	const colors = tokens(named('button.primary.bg', '#ff0000'));
	expect(Object.keys(colors)).toEqual(['button.primary.bg']);
	expect(colors).toMatchSnapshot();
});

test('tokens keep a token and its group prefix side by side', () => {
	const colors = tokens(
		named('button/primary', '#ff0000'),
		named('button/primary/bg', '#00ff00')
	);
	expect(Object.keys(colors)).toEqual([
		'button/primary',
		'button/primary/bg'
	]);
	expect(colors).toMatchSnapshot();
});

test('tokens lose a color when two share a name', () => {
	const colors = tokens(
		named('brand', '#ff0000'),
		named('brand', '#00ff00')
	);
	// Known loss: the red color is silently dropped, only the
	// last one with the name is exported.
	expect(Object.keys(colors)).toEqual(['brand']);
	expect(colors.brand.$value).toBe('#00ff00');
	expect(JSON.stringify(colors)).not.toContain('#ff0000');
	expect(colors).toMatchSnapshot();
});
