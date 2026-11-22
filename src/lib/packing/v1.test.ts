import {parseColor} from '#lib/color/parsing.js';
import {defaultArgs} from '#lib/core/nodes.js';
import defs from '#lib/definitions/index.js';
import color from '#lib/definitions/nodes/color.js';
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

test('unpack tokens packed before separators were escaped', () => {
	expect(unpack('0@0122x28@l,100%,amount')).toMatchObject({
		type: 'l',
		token: '100%',
		args: {amount: 40}
	});
});

test.each([
	['0@010@nope,', 'permalink.type: unknown node type "nope"'],
	[
		'0@0122x77@l,,amount',
		'permalink.args.amount: expected an integer between 0 and 100'
	]
])('unpack rejects invalid data %s', (data, message) => {
	expect(() => unpack(data)).toThrow(message);
});
