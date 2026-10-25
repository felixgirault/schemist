import {formatSchemistToHex} from '#lib/color/formatting.js';
import {parseColor} from '#lib/color/parsing.js';
import {parseTree} from '#lib/presets.js';
import {collectOutputs} from '#lib/stores/nodes.svelte.js';
import {expect, test} from 'vitest';
import presets from './index';

// Guards the colors and names of presets, whatever the way they
// are built (plain nodes or groups, see ADR 4).
test.each(presets)('preset $label', ({nodes}) => {
	const tree = parseTree({
		type: 'clr',
		token: 'Brand',
		args: {color: parseColor('#c93')[1]!},
		children: nodes
	});

	expect(
		Object.values(collectOutputs(tree)).map(
			([color, name]) =>
				`${formatSchemistToHex(color)} ${name}`
		)
	).toMatchSnapshot();
});
