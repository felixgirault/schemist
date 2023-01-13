import {expect, test} from 'vitest';
import {parseColor} from '$lib/color/parsing';
import defs from '$lib/definitions/nodes';
import color from '$lib/definitions/nodes/color';
import presets from '$lib/definitions/presets';
import {defaultArgs} from '$lib/stores/nodes';
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
