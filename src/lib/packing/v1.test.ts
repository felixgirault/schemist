import {parseColor} from '#lib/color/parsing.js';
import color from '#lib/definitions/nodes/color.js';
import defs from '#lib/definitions/nodes/index.js';
import presets from '#lib/definitions/presets/index.js';
import {defaultArgs} from '#lib/stores/nodes.svelte.js';
import {expect, test} from 'vitest';
import {pack, unpack} from './v1';

test.each(Object.values(defs))('pack node $label', ({type}) => {
	const tree = {
		type,
		args: defaultArgs(defs[type])
	};

	const packed = pack(tree);
	const unpacked = unpack(packed);

	expect(packed).toMatchSnapshot();
	expect(unpacked).toMatchObject(tree);
});

test.each(Object.values(presets))(
	'pack preset $label',
	({nodes}) => {
		const tree = {
			type: color.type,
			args: {
				color: parseColor('#f00')[1]!
			},
			children: nodes
		};

		const packed = pack(tree);
		const unpacked = unpack(packed);

		expect(packed).toMatchSnapshot();
		expect(unpacked).toMatchObject(tree);
	}
);

// Integer-like keys come first when enumerating object keys,
// which used to shift the packed dictionary (see #8).
test.each([
	{
		type: color.type,
		args: {color: parseColor('#367591')[1]!}
	},
	{
		type: color.type,
		args: {color: parseColor('#f00')[1]!},
		children: [
			{type: 'l' as const, token: '500', args: {amount: 50}}
		]
	}
])('pack integer-like dictionary entries %#', (tree) => {
	expect(unpack(pack(tree))).toMatchObject(tree);
});
