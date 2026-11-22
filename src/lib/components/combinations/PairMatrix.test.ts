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
	palette.setPair(node('Black').id, root.id, {wcag2: 4.5});
	palette.setPair(node('Grey').id, root.id, {wcag2: 4.5});
	palette.setPair(node('Secret').id, root.id, {wcag2: 4.5});
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

test('toggles the targets of the use on a pair', () => {
	const entry = (token: string) =>
		palette.colors.find(({id}) => id === node(token).id)!;
	const pairOf = () =>
		palette.pairs.find(
			({fg, bg}) =>
				fg === node('Grey').id && bg === node('Black').id
		);

	combinations.use = 'categories';
	combinations.toggleUse(entry('Grey'), entry('Black'));
	expect(pairOf()).toMatchObject({difference: 10});

	// another use adds all its targets to the same pair
	combinations.use = 'body';
	combinations.toggleUse(entry('Grey'), entry('Black'));
	expect(pairOf()).toMatchObject({
		difference: 10,
		wcag2: 4.5,
		apca: 75
	});

	// the same use removes its targets, the last ones the pair
	combinations.toggleUse(entry('Grey'), entry('Black'));
	expect(pairOf()).toMatchObject({difference: 10});
	expect(pairOf()?.wcag2).toBeUndefined();
	expect(pairOf()?.apca).toBeUndefined();
	combinations.use = 'categories';
	combinations.toggleUse(entry('Grey'), entry('Black'));
	expect(pairOf()).toBeUndefined();

	// a target at another value, typed in the card, is set to the
	// use's value rather than removed
	palette.setPair(node('Grey').id, node('Black').id, {
		wcag2: 7
	});
	combinations.use = 'large';
	combinations.toggleUse(entry('Grey'), entry('Black'));
	expect(pairOf()).toMatchObject({wcag2: 3});
	combinations.toggleUse(entry('Grey'), entry('Black'));
	expect(pairOf()).toBeUndefined();

	// an empty custom use declares nothing
	combinations.custom = {};
	combinations.use = 'custom';
	combinations.toggleUse(entry('Grey'), entry('Black'));
	expect(pairOf()).toBeUndefined();
	combinations.use = 'body';
});

test('custom starts from the last use and checks what is typed', () => {
	combinations.use = 'large';
	combinations.setUse('custom');
	expect(combinations.custom).toEqual({wcag2: 3});

	combinations.custom = {apca: 75};
	expect(combinations.useTargets).toEqual({apca: 75});

	combinations.use = 'body';
});

test('dims the cells that miss the use', () => {
	combinations.use = 'body';

	const html = render(PairMatrix).body;

	// Grey on White (1.2:1) and White on Grey miss it
	expect(html.match(/pair-cell--dim/g)).toHaveLength(2);
	expect(html).toContain(
		'Grey on White: does not meet its targets, misses the minimum'
	);
});

test('draws one strip per simulation in every cell', () => {
	combinations.blindnessTypes = ['protanomaly', 'tritanomaly'];

	const html = render(PairMatrix).body;

	expect(html.match(/class="strip[ "]/g)).toHaveLength(12);
	expect(html).toContain(', protanomaly wcag2 ');
	expect(html).toContain('pair-cell--tall');

	combinations.blindnessTypes = [];
	expect(render(PairMatrix).body).not.toContain(
		'class="strip"'
	);
});

test('a click opens the card without declaring', () => {
	const before = palette.pairs.length;
	const html = render(PairMatrix).body;

	expect(html).toContain('aria-pressed="false"');
	expect(palette.pairs).toHaveLength(before);
});

test('the card has the lens, Require and Preview', () => {
	combinations.use = 'body';
	combinations.blindnessTypes = ['protanomaly'];
	combinations.openPairIds = {
		fg: node('Grey').id,
		bg: node('Black').id
	};

	let html = render(PairMatrix).body;

	expect(html).toContain('Require Body text');
	expect(html).toContain('WCAG 2 contrast, at least 4.5');
	expect(html).toContain('APCA contrast, at least 75');
	expect(html).toContain('protanomaly');
	expect(html).toContain('Preview');

	// Require toggles the use's targets on the pair
	combinations.toggleUse(
		palette.colors.find((e) => e.id === node('Grey').id)!,
		palette.colors.find((e) => e.id === node('Black').id)!
	);
	html = render(PairMatrix).body;
	expect(html).toContain('Remove Body text requirement');

	// Preview finds the pair
	combinations.previewedUid = `${node('Black').id}-${node('Grey').id}`;
	expect(combinations.previewed).toBeTruthy();
	expect(render(PairMatrix).body).toContain('Stop preview');

	combinations.previewedUid = null;
	combinations.openPairIds = null;
	combinations.blindnessTypes = [];
	palette.setPair(node('Grey').id, node('Black').id, {});
});

test('counts the cells meeting the use', () => {
	combinations.use = 'body';

	expect(combinations.cellCount).toBe(6);
	expect(combinations.passingCells).toBe(4);
});

test('docks the card as a labelled region beside the grid', () => {
	expect(render(PairMatrix).body).not.toContain(
		'pair-card-title'
	);

	combinations.openPairIds = {
		fg: node('Grey').id,
		bg: node('Black').id
	};

	const html = render(PairMatrix).body;

	expect(html).toMatch(
		/<section[^>]*aria-labelledby="pair-card-title"/
	);
	expect(html).not.toContain('popover');

	combinations.openPairIds = null;
});
