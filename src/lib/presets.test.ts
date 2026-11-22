import {formatSchemistToHex} from '#lib/color/formatting.js';
import presets from '#lib/definitions/presets/index.js';
import {collectOutputs} from '#lib/stores/nodes.svelte.js';
import {rootTree} from '#lib/testing/tree.js';
import {parseTree} from '#lib/tree.js';
import {expect, test} from 'vitest';

const cases = Object.values(presets).flatMap((preset) =>
	['#ff0000', '#3b82f6', '#808080'].map((hex) => ({
		preset,
		hex
	}))
);

test.each(cases)(
	'outputs of preset $preset.label under $hex',
	({preset, hex}) => {
		const outputs = Object.values(
			collectOutputs(parseTree(rootTree(hex, preset.nodes)))
		).map(({color, name}) => [
			formatSchemistToHex(color),
			name
		]);

		expect(outputs).toMatchSnapshot();
	}
);
