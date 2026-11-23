import {parseColor} from '#lib/color/parsing.js';
import {uses} from '#lib/core/pairs.js';
import {combinations} from '#lib/stores/combinations.svelte.js';
import {collectNodes} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {loadPalette, rootTree} from '#lib/testing/tree.js';
import {render} from 'svelte/server';
import {beforeAll, expect, test} from 'vitest';
import Combinations from './Combinations.svelte';
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
	expect(html).not.toContain('Remove pair');
});

test('lists the pairs left out when a color is hidden', () => {
	expect(render(Combinations).body).toContain(
		'Secret on White'
	);
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

	const html = render(Combinations).body;

	expect(html).toContain('Remove pair');
	expect(html).toContain('normal vision');

	combinations.openPairIds = null;
});

test('toggles the targets of a use on a pair', () => {
	const entry = (token: string) =>
		palette.colors.find(({id}) => id === node(token).id)!;
	const pairOf = () =>
		palette.pairs.find(
			({fg, bg}) =>
				fg === node('Grey').id && bg === node('Black').id
		);
	const use = (id: string) => uses.find((u) => u.id === id)!;
	const toggle = (id: string) =>
		combinations.toggleUse(
			entry('Grey'),
			entry('Black'),
			use(id)
		);

	toggle('categories');
	expect(pairOf()).toMatchObject({difference: 10});

	// another use adds all its targets to the same pair
	toggle('body');
	expect(pairOf()).toMatchObject({
		difference: 10,
		wcag2: 4.5,
		apca: 75
	});

	// the same use removes its targets, the last ones the pair
	toggle('body');
	expect(pairOf()).toMatchObject({difference: 10});
	expect(pairOf()?.wcag2).toBeUndefined();
	expect(pairOf()?.apca).toBeUndefined();
	toggle('categories');
	expect(pairOf()).toBeUndefined();

	// a target at another value, typed in the card, is set to the
	// use's value rather than removed
	palette.setPair(node('Grey').id, node('Black').id, {
		wcag2: 7
	});
	toggle('large');
	expect(pairOf()).toMatchObject({wcag2: 3});
	toggle('large');
	expect(pairOf()).toBeUndefined();
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

test('the card has a button per use, the checks and Preview', () => {
	combinations.blindnessTypes = ['protanomaly'];
	combinations.openPairIds = {
		fg: node('Grey').id,
		bg: node('Black').id
	};

	let html = render(Combinations).body;

	expect(html).toContain('aria-label="Require Body text"');
	expect(html).toContain('+ Large text and UI');
	expect(html).toContain('Not declared.');
	expect(html).toContain('Preview');

	// a button toggles the use's targets on the pair
	combinations.toggleUse(
		palette.colors.find((e) => e.id === node('Grey').id)!,
		palette.colors.find((e) => e.id === node('Black').id)!,
		uses[0]
	);
	html = render(Combinations).body;
	expect(html).toContain('aria-label="Remove Body text"');
	expect(html).toContain('Body text ✓');
	expect(html).toContain('WCAG 2 contrast, at least 4.5');
	expect(html).toContain('APCA contrast, at least 75');
	expect(html).toContain('protanomaly');
	expect(html).toContain('For Body text.');
	expect(html).toContain(', for Body text"');

	// Preview finds the pair
	combinations.previewedUid = `${node('Black').id}-${node('Grey').id}`;
	expect(combinations.previewed).toBeTruthy();
	expect(render(Combinations).body).toContain('Stop preview');

	combinations.previewedUid = null;
	combinations.openPairIds = null;
	combinations.blindnessTypes = [];
	palette.setPair(node('Grey').id, node('Black').id, {});
});

test('lays out the grid and the requirements on one page', () => {
	const html = render(Combinations).body;

	expect(html).toContain('class="matrix"');
	expect(html).toContain('id="requirements-title"');
	expect(html).not.toContain('Contrast list');
});

test('docks the card as a labelled region beside the grid', () => {
	expect(render(Combinations).body).not.toContain(
		'pair-card-title'
	);

	combinations.openPairIds = {
		fg: node('Grey').id,
		bg: node('Black').id
	};

	const html = render(Combinations).body;

	expect(html).toMatch(
		/<section[^>]*aria-labelledby="pair-card-title"/
	);
	expect(html).not.toContain('popover');

	combinations.openPairIds = null;
});

test('lists the declared pairs by use when none is open', () => {
	const id = node('Grey').id;

	palette.setPair(id, node('Black').id, {wcag2: 4.5, apca: 75});

	const html = render(Combinations).body;

	expect(html).toContain('Requirements');
	expect(html).toContain('One-off pairs');
	expect(html).toContain('<h5 class="h3">Body text</h5>');
	// declared with a lone target: Custom, listed last
	expect(html).toContain('>Custom</h5>');
	expect(html).toContain('Not checked, a color is hidden');
	expect(html).toContain('Secret on White');
	expect(html).not.toContain('pair-card-title');
	expect(combinations.requirements.map((r) => r.id)).toEqual([
		'body',
		'custom'
	]);

	palette.setPair(id, node('Black').id, {});
});

test('lists rules, sorts colors by role and names sources', () => {
	const root = palette.root!;
	const surfaces = palette.addRole('Surfaces', [root.id])!;
	const text = palette.addRole('Text', [
		node('Grey').id,
		node('Black').id
	])!;
	const rule = palette.addRule(text, surfaces, 'body');

	const html = render(Combinations).body;

	expect(html).toContain('Text on Surfaces, Body text');
	expect(html).toContain('title="White, Surfaces"');
	// the role's colors first, the others last
	expect(html.indexOf('title="White, Surfaces"')).toBeLessThan(
		html.indexOf('title="Grey, Text"')
	);
	expect(combinations.pairColors.map(({name}) => name)).toEqual(
		['White', 'Grey', 'Black']
	);
	// both couples are declared one-off, which replace the rule's
	expect(combinations.ruleCells.get(rule)!.size).toBe(0);
	expect(
		palette.expandedPairs.some(({sources}) =>
			sources.overrides.includes(rule)
		)
	).toBe(true);
	expect(combinations.describeRule(palette.rules[0])).toEqual({
		label: 'Text on Surfaces',
		use: 'Body text'
	});

	palette.deleteRole(surfaces);
	palette.deleteRole(text);
});
