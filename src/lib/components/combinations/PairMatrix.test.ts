import {parseColor} from '#lib/color/parsing.js';
import {combinations} from '#lib/stores/combinations.svelte.js';
import {collectNodes} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {loadPalette, rootTree} from '#lib/testing/tree.js';
import {render} from 'svelte/server';
import {beforeAll, expect, test} from 'vitest';
import PairMatrix from './PairMatrix.svelte';

const named = (
	token: string,
	hex: string,
	isHidden = false
) => ({
	type: 'clr' as const,
	token,
	isHidden,
	args: {color: parseColor(hex)[1]!}
});

const node = (token: string) =>
	collectNodes(palette.root!).find((n) => n.token === token)!;

beforeAll(() => {
	loadPalette(
		rootTree('#ffffff', [
			named('Black', '#000000'),
			named('Grey', '#eeeeee'),
			named('Secret', '#123456', true)
		])
	);
	const root = palette.root!;
	palette.setPair(node('Black'), root, {wcag2: 4.5});
	palette.setPair(node('Grey'), root, {wcag2: 4.5});
	palette.setPair(node('Secret'), root, {wcag2: 4.5});
});

test('counts the declared pairs of visible colors', () => {
	expect(combinations.pairChecks).toHaveLength(2);
	expect(combinations.passingPairs).toBe(1);
	expect(combinations.hiddenPairs).toHaveLength(1);
});

test('shows the status of every cell besides its color', () => {
	const html = render(PairMatrix).body;

	expect(html).toContain('meets its targets');
	expect(html).toContain('does not meet its targets');
	expect(html).toContain('not declared');
	expect(html).toContain('Secret on');
	expect(html).not.toContain('Remove pair');
});

test('draws every cell as its pair, declared or not', () => {
	const html = render(PairMatrix).body;
	// 3 visible colors: 6 ordered pairs, 2 of them declared
	const cells = html.match(/class="preview/g) ?? [];

	expect(cells).toHaveLength(6);
	expect(html).toContain(
		'--cell-bg: #000000; --cell-fg: #eeeeee;'
	);
	expect(html).toContain('title="Grey on Black, 18.1:1"');
});

test('opens the details of a declared pair', () => {
	const fg = node('Grey');
	const bg = palette.root!;

	combinations.openPairIds = {fg: fg.id, bg: bg.id};

	const html = render(PairMatrix).body;

	expect(html).toContain('Remove pair');
	expect(html).toContain('normal vision');

	combinations.openPairIds = null;
});
