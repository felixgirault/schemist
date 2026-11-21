import {parseColor} from '#lib/color/parsing.js';
import {exportSettings} from '#lib/stores/export.svelte.js';
import {loadPalette, rootTree} from '#lib/testing/tree.js';
import {render} from 'svelte/server';
import {afterAll, beforeAll, expect, test, vi} from 'vitest';
import Export from './Export.svelte';

const named = (token: string, hex: string) => ({
	type: 'clr' as const,
	token,
	args: {color: parseColor(hex)[1]!}
});

beforeAll(() => {
	vi.stubGlobal('window', {
		location: {origin: 'https://schemist.test'}
	});
	loadPalette(
		rootTree('#3b82f6', [
			named('button/primary/bg', '#ff0000'),
			named('button.primary.bg', '#00ff00'),
			named('button/primary', '#0000ff'),
			named('brand', '#111111'),
			named('brand', '#222222')
		])
	);
	exportSettings.format = 'tokens';
});

afterAll(() => {
	exportSettings.format = 'table';
	vi.unstubAllGlobals();
});

// Covers the nested tokens output for slash, dot, prefix
// and duplicate names; the duplicate keeps both colors.
test('export tokens with separators and duplicate names', () => {
	const html = render(Export).body;
	const code = html.match(
		/<textarea[^>]*>([\s\S]*)<\/textarea>/
	)![1];
	expect(code).toContain('#111111');
	expect(code).toContain('#222222');
	expect(code).toMatchSnapshot();
});
