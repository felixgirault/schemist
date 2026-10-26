import {formatSchemistToHex} from '#lib/color/formatting.js';
import {parseColor} from '#lib/color/parsing.js';
import {collectOutputs} from '#lib/stores/nodes.svelte.js';
import {parseTree} from '#lib/tree.js';
import {expect, test} from 'vitest';
import presets from './index';

// Guards the colors and names of presets, whatever the way they
// are built (static trees or parametric ones, see ADR 4).
test.each(presets)('preset $label', ({type}) => {
	const tree = parseTree({
		type: 'clr',
		token: 'Brand',
		args: {color: parseColor('#c93')[1]!},
		children: [{type}]
	});

	expect(
		Object.values(collectOutputs(tree)).map(
			([color, name]) =>
				`${formatSchemistToHex(color)} ${name}`
		)
	).toMatchSnapshot();
});
