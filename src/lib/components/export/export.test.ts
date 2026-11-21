import {formatSchemistTo} from '#lib/color/formatting.js';
import presets from '#lib/definitions/presets/index.js';
import {combinations} from '#lib/stores/combinations.svelte.js';
import type {ExportEntry} from '#lib/stores/export.svelte.js';
import {loadPalette, rootTree} from '#lib/testing/tree.js';
import {render} from 'svelte/server';
import {afterAll, beforeAll, expect, test, vi} from 'vitest';
import DesignTokensExport from './DesignTokensExport.svelte';
import VariablesExport from './VariablesExport.svelte';

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

const entries = (): ExportEntry[] =>
	combinations.colorEntries.map((entry) => ({
		...entry,
		cssColor: formatSchemistTo(entry.color, 'hex', 3)
	}));

test.each([
	['css', 'dash', ''],
	['css', 'camel', 'brand'],
	['sass', 'dash', ''],
	['sass', 'camel', 'brand']
] as const)(
	'%s export, %s casing, prefix "%s"',
	(format, casing, prefix) => {
		const {body} = render(VariablesExport, {
			props: {entries: entries(), format, casing, prefix}
		});

		expect(code(body)).toMatchSnapshot();
	}
);

test('design tokens export', () => {
	const {body} = render(DesignTokensExport, {
		props: {entries: combinations.colorEntries}
	});

	expect(code(body)).toMatchSnapshot();
});
