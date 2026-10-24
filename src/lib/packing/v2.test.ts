import {formatSchemistToHex} from '#lib/color/formatting.js';
import {randomUsableColor} from '#lib/color/manipulation.js';
import color from '#lib/definitions/nodes/color.js';
import presets from '#lib/definitions/presets/index.js';
import {parseTree} from '#lib/presets.js';
import {collectOutputs} from '#lib/stores/nodes.svelte.js';
import {expect, test} from 'vitest';
import {
	pack as packVersioned,
	unpack as unpackVersioned
} from './index';
import {pack, unpack} from './v2';

const outputHexes = (tree: Parameters<typeof parseTree>[0]) =>
	Object.values(collectOutputs(parseTree(tree))).map(([c]) =>
		formatSchemistToHex(c)
	);

test('colors are packed losslessly', () => {
	const tree = {
		type: color.type,
		args: {color: {h: 123, s: 56.78901234567891, l: 1e-7}}
	};

	expect(unpack(pack(tree))).toMatchObject(tree);
});

test.each(Object.values(presets))(
	'preset $label yields the same colors once unpacked',
	({nodes}) => {
		const tree = {
			type: color.type,
			args: {color: randomUsableColor()},
			children: nodes
		};

		expect(
			outputHexes(unpackVersioned(packVersioned(tree)))
		).toEqual(outputHexes(tree));
	}
);

test('invalid colors are rejected', () => {
	expect(() => unpack('0@0122@clr,,color,red')).toThrow();
});

test('v1 permalinks are still supported', () => {
	expect(
		unpackVersioned('1@0@01223@clr,,color,ffc208')
	).toMatchObject({
		type: 'clr',
		args: {color: {h: expect.any(Number)}}
	});
});
