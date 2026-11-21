import {evaluate} from '#lib/core/evaluate.js';
import {
	exportTokens,
	exportVariables,
	toExportEntries
} from '#lib/core/export.js';
import presets from '#lib/definitions/presets/index.js';
import {exportSettings} from '#lib/stores/export.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {loadPalette, rootTree} from '#lib/testing/tree.js';
import {render} from 'svelte/server';
import {afterAll, beforeAll, expect, test, vi} from 'vitest';
import Export from './Export.svelte';

const tree = rootTree('#3b82f6', [
	...presets.find(({label}) => label === 'Semantic colors')!
		.nodes
]);

beforeAll(() => {
	vi.stubGlobal('window', {
		location: {origin: 'https://schemist.test'}
	});
	loadPalette(tree);
});

afterAll(() => {
	vi.unstubAllGlobals();
});

const code = (html: string) =>
	html.match(/<textarea[^>]*>([\s\S]*)<\/textarea>/)![1];

const cases = [
	{format: 'css', casing: 'dash', prefix: ''},
	{format: 'css', casing: 'camel', prefix: 'brand'},
	{format: 'sass', casing: 'dash', prefix: ''},
	{format: 'sass', casing: 'camel', prefix: 'brand'},
	{format: 'css', colorFormat: 'rgb'},
	{format: 'css', colorFormat: 'hsl', precision: 1},
	{format: 'sass', colorFormat: 'lch', precision: 1},
	{format: 'tokens'}
] as Partial<typeof exportSettings>[];

// Runs `fn` with settings applied over the defaults.
const withSettings = <T>(
	settings: Partial<typeof exportSettings>,
	fn: () => T
) => {
	const saved = {...exportSettings};
	Object.assign(exportSettings, settings);

	try {
		return fn();
	} finally {
		Object.assign(exportSettings, saved);
	}
};

test.each(cases)('export %j', (settings) => {
	withSettings(settings, () =>
		expect(code(render(Export).body)).toMatchSnapshot()
	);
});

test.each(cases)(
	'core export matches the component for %j',
	(settings) => {
		withSettings(settings, () => {
			const entries = evaluate(tree);
			const {format, colorFormat, precision, casing, prefix} =
				exportSettings;

			expect(
				format === 'tokens'
					? exportTokens(entries, palette.permalink)
					: exportVariables(
							toExportEntries(
								entries,
								colorFormat,
								precision
							),
							{format, casing, prefix},
							palette.permalink
						)
			).toBe(code(render(Export).body));
		});
	}
);
