import {schemistColor} from '$lib/color/spaces';
import defs from '$lib/definitions/nodes';
import color from '$lib/definitions/nodes/color';
import presets from '$lib/definitions/presets';
import schemistPreset from '$lib/definitions/presets/schemist';
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

test.each(Object.values(presets))('pack preset $label', () => {
	const tree = {
		type: color.type,
		args: {
			color: schemistColor('#f00')
		},
		children: schemistPreset.nodes
	};

	const packed = pack(tree);
	const unpacked = unpack(packed);

	expect(packed).toMatchSnapshot();
	expect(unpacked).toMatchObject(tree);
});
