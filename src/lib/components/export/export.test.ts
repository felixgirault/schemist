import presets from '#lib/definitions/presets/index.js';
import {exportSettings} from '#lib/stores/export.svelte.js';
import {loadPalette, rootTree} from '#lib/testing/tree.js';
import {render} from 'svelte/server';
import {afterAll, beforeAll, expect, test, vi} from 'vitest';
import Export from './Export.svelte';

beforeAll(() => {
	vi.stubGlobal('window', {
		location: {origin: 'https://schemist.test'}
	});
	loadPalette(
		rootTree('#3b82f6', [
			...presets.find(
				({label}) => label === 'Semantic colors'
			)!.nodes
		])
	);
});

afterAll(() => {
	vi.unstubAllGlobals();
});

const code = (html: string) =>
	html.match(/<textarea[^>]*>([\s\S]*)<\/textarea>/)![1];

test.each([
	{format: 'css', casing: 'dash', prefix: ''},
	{format: 'css', casing: 'camel', prefix: 'brand'},
	{format: 'sass', casing: 'dash', prefix: ''},
	{format: 'sass', casing: 'camel', prefix: 'brand'},
	{format: 'css', colorFormat: 'rgb'},
	{format: 'css', colorFormat: 'hsl', precision: 1},
	{format: 'sass', colorFormat: 'lch', precision: 1},
	{format: 'tokens'}
] as Partial<typeof exportSettings>[])(
	'export %j',
	(settings) => {
		const saved = {...exportSettings};
		Object.assign(exportSettings, settings);

		try {
			expect(code(render(Export).body)).toMatchSnapshot();
		} finally {
			Object.assign(exportSettings, saved);
		}
	}
);
