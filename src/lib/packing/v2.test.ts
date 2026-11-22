import {formatSchemistToHex} from '#lib/color/formatting.js';
import {randomUsableColor} from '#lib/color/manipulation.js';
import {evaluate} from '#lib/core/evaluate.js';
import type {NodeData} from '#lib/core/nodes.js';
import color from '#lib/definitions/nodes/color.js';
import presets from '#lib/definitions/presets/index.js';
import {expect, test} from 'vitest';
import {
	pack as packVersioned,
	unpack as unpackVersioned
} from './index';
import {pack, unpack} from './v2';

const outputHexes = (tree: NodeData) =>
	evaluate(tree).map(({color}) => formatSchemistToHex(color));

test('colors are packed losslessly', () => {
	const tree = {
		type: color.type,
		args: {color: {h: 123, s: 56.78901234567891, l: 1e-7}}
	};

	expect(unpack(pack(tree))).toMatchObject(tree);
});

test.each(Object.values(presets))(
	'preset $label yields the same colors once unpacked',
	({type}) => {
		const tree = {
			type: color.type,
			args: {color: randomUsableColor()},
			children: [{type}]
		};

		expect(
			outputHexes(unpackVersioned(packVersioned(tree)))
		).toEqual(outputHexes(tree));
	}
);

test.each([
	'red',
	'1_2',
	'1__2',
	'1_2_',
	'1_2_3_4',
	'1_2_Infinity'
])('invalid color %j is rejected', (color) => {
	expect(() => unpack(`0@01223@clr,,color,${color}`)).toThrow(
		'Invalid color'
	);
});

test.each(['-720_500_-300', '361_50_50', '0_101_50', '0_50_-1'])(
	'out of range color %j is rejected',
	(color) => {
		expect(() =>
			unpack(`0@01223@clr,,color,${color}`)
		).toThrow('expected h within 0–360');
	}
);

test('v1 permalinks are still supported', () => {
	expect(
		unpackVersioned('1@0@01223@clr,,color,ffc208')
	).toMatchObject({
		type: 'clr',
		args: {color: {h: expect.any(Number)}}
	});
});

test('permalinks are written with version 2', () => {
	expect(packVersioned({type: 'clr'})).toMatch(/^2@/);
});

const pairsTree: NodeData = {
	type: 'clr',
	token: 'Bg',
	args: {color: {h: 85.4, s: 99.9, l: 82.1}},
	children: [
		{type: 'ctr', token: 'On $', args: {amount: 80}},
		{type: 'cmp', token: 'Chart 1', isHidden: true}
	],
	pairs: [
		{fg: 'On Bg', bg: 'Bg', wcag2: 4.5, apca: 60},
		{fg: 'Chart 1', bg: 'Bg', difference: 10.5}
	]
};

test('packs pairs by names', () => {
	expect(
		unpackVersioned(packVersioned(pairsTree))
	).toMatchObject(pairsTree);
});

test('packs a tree without pairs', () => {
	const {pairs, ...plain} = pairsTree;
	const unpacked = unpackVersioned(packVersioned(plain));

	expect(unpacked).toMatchObject(plain);
	expect(unpacked).not.toHaveProperty('pairs');
});

test('ignores unknown or malformed targets', () => {
	const packed = packVersioned({
		type: 'cmp',
		token: 'A',
		pairs: [{fg: 'A', bg: 'B', wcag2: 3}]
	});

	expect(
		unpackVersioned(packed.replace('wcag2', 'nope')).pairs
	).toEqual([{fg: 'A', bg: 'B'}]);
});
