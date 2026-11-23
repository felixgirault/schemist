import {parseColor} from '#lib/color/parsing.js';
import {uses} from '#lib/core/pairs.js';
import {combinations} from '#lib/stores/combinations.svelte.js';
import {collectNodes} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {loadPalette, rootTree} from '#lib/testing/tree.js';
import {render} from 'svelte/server';
import {beforeAll, expect, test} from 'vitest';
import Result from './Result.svelte';

const named = (token: string, hex: string) => ({
	type: 'clr' as const,
	token,
	args: {color: parseColor(hex)[1]!}
});

const id = (token: string) =>
	collectNodes(palette.root!).find((n) => n.token === token)!
		.id;

beforeAll(() => {
	loadPalette(
		rootTree('#ffffff', [
			named('Black', '#000000'),
			named('Grey', '#eeeeee'),
			named('Red', '#ff0000'),
			named('Blue', '#0000ff')
		])
	);
	const surfaces = palette.addRole('Surfaces', [
		palette.root!.id
	]);
	const text = palette.addRole('Text', [
		id('Black'),
		id('Grey')
	]);
	const series = palette.addRole('Series', [
		id('Red'),
		id('Blue')
	]);

	palette.setRule(text!, surfaces!, 'body');
	palette.setRule(series!, undefined, 'categories');
});

// The text of the page, without tags and comments
const text = (html: string) =>
	html.replace(/<!--.*?-->|<[^>]*>/g, '').replace(/\s+/g, ' ');

test('shows every rule in one table, its pairs under its title', () => {
	const {body} = render(Result);
	const html = text(body);

	// the grid of targets, then the checks
	expect(body.match(/<table/g)).toHaveLength(2);
	expect(body.match(/scope="rowgroup"/g)).toHaveLength(2);
	expect(html).toMatch(
		/Text on Surfaces · Body text not met ?Black &amp; White.*Series among themselves · Categories met ?(Red|Blue) &amp; /
	);

	expect(html).not.toContain('Pack my box');
	expect(html).toContain(
		'Black &amp; White AAA 21 ✓ met· Lc 106 ✓ met'
	);
	expect(html).toContain('Grey &amp; White KO 1.2 ✗ not met');
	expect(html).toMatch(
		/(Red|Blue) &amp; (Blue|Red) Difference [\d.]+ ✓ met/
	);
});

// The text of the selected option of a select, by its label
const selected = (label: string) =>
	render(Result).body.match(
		new RegExp(
			`aria-label="${label}".*?<option[^>]*selected[^>]*>(?:<!---->)?([^<]*)`
		)
	)?.[1];

test('rounds an APCA level down, never up to the goal', () => {
	const grey = id('Grey');
	const root = palette.root!.id;

	palette.setPair(grey, root, {apca: 200});

	const [{level}] = combinations.pairChecks.find(
		({fg, bg}) => fg.id === grey && bg.id === root
	)!.checks;
	const plain = text(render(Result).body);

	expect(level % 1).not.toBe(0);
	expect(plain).toContain(`Lc ${Math.floor(level)} ✗ not met`);

	// the goal just above the level: the integer part is not the goal
	palette.setPair(grey, root, {apca: Math.ceil(level)});
	expect(text(render(Result).body)).toContain(
		`Lc ${Math.floor(level)} ✗ not met`
	);

	palette.setPair(grey, root, {});
});

test('previews a pair, declared or not', () => {
	combinations.previewedUid = `${palette.root!.id}-${id('Black')}`;
	const previewed = combinations.previewed;

	combinations.previewedUid = null;
	expect(previewed?.fgName).toBe('Black');
	expect(previewed?.bgName).toBe('White');
	expect(combinations.previewed).toBeNull();
});

test('shows a row per role with its colors, and a grid of its rules', () => {
	const html = render(Result).body;
	const plain = text(html);

	expect(html).toContain('aria-label="Role name" value="Text"');
	expect(plain).toContain('Text on Surfaces · Body text');
	expect(plain).toContain(
		'Series among themselves · Categories'
	);
	expect(html).toMatch(/<th scope="row"[^>]*>Text<\/th>/);
	expect(html).toMatch(
		/<th scope="col"[^>]*>on Surfaces<\/th>/
	);
	expect(selected('Text on Surfaces')).toBe('Body text');
	expect(selected('Series among themselves')).toBe(
		'Categories'
	);
	expect(selected('Surfaces on Text')).toBe('—');
	expect(html).toContain('aria-label="Delete role Text"');
	expect(html).toContain('aria-label="Add a color to Series"');
	expect(html).toContain('aria-label="Remove Black from Text"');
	expect(html).toContain('+ Role');
	expect(html).toMatch(/<h3[^>]*>Roles<\/h3>/);
	expect(
		html.match(
			/<select[^>]*aria-label="Surfaces on Text"[^>]*>/
		)![0]
	).toMatch(/class="[^"]*empty/);
	// Delete role comes after the colors' list, apart from the chips
	expect(html.indexOf('Add a color to Text')).toBeLessThan(
		html.indexOf('Delete role Text')
	);
});

test('draws a difference cell as two swatches, not text on a background', () => {
	const html = render(Result).body;

	// Red & Blue, the Series among themselves, in the panel's colors;
	// Text on Surfaces keeps its own.
	expect(html.match(/class="swatches\b/g)).toHaveLength(1);
	expect(html).toMatch(
		/<td class="cell[^"]*"( style="")?>(<!--.*?-->)*<span class="swatches/
	);
});

test('offers Override on a rule pair, Remove pair on a one-off', () => {
	expect(render(Result).body).toContain('Override');
	expect(render(Result).body).not.toContain('Remove pair');
});

test('shows One-off pairs and + Pair with no one-off pair', () => {
	const html = text(render(Result).body);

	expect(combinations.oneOffChecks).toHaveLength(0);
	expect(html).toContain('One-off pairs');
	expect(html).toContain('+ Pair');
});

test('declares a pair for a use, two different colors only', () => {
	const grey = id('Grey');
	const red = id('Red');
	const body = uses.find(({id}) => id === 'body')!;
	const pairOf = () =>
		palette.pairs.find(
			({fg, bg}) => fg === grey && bg === red
		);

	expect(combinations.addPair(grey, grey, body)).toBe(false);
	expect(pairOf()).toBeUndefined();

	expect(combinations.addPair(grey, red, body)).toBe(true);
	expect(pairOf()).toMatchObject({wcag2: 4.5, apca: 75});
	expect(text(render(Result).body)).toContain('Remove pair');

	palette.setPair(grey, red, {});
});

test('lists one-off pairs by use', () => {
	const grey = id('Grey');
	const root = palette.root!.id;
	const body = uses.find(({id}) => id === 'body')!;

	combinations.addPair(grey, root, body);
	palette.setPair(id('Red'), root, {wcag2: 4.5, apca: 80});

	const html = text(render(Result).body);

	expect(html).toContain(
		'One-off pairs · Body text Grey &amp; White'
	);
	expect(html).toContain(
		'One-off pairs · Custom Red &amp; White'
	);
	expect(combinations.requirements.map((r) => r.id)).toEqual([
		'body',
		'custom'
	]);

	palette.setPair(grey, root, {});
	palette.setPair(id('Red'), root, {});
});

test('a one-off pair edits its targets, buttons name their pair', () => {
	const red = id('Red');
	const root = palette.root!.id;

	palette.setPair(red, root, {wcag2: 3});

	const html = render(Result).body;

	expect(html).toContain(
		'aria-label="WCAG 2 target of Red on White"'
	);
	expect(html).toContain(
		'aria-label="APCA target of Red on White"'
	);
	expect(html).toContain(
		'aria-label="Remove pair Red on White"'
	);
	expect(html).toContain(
		'aria-label="Override Black on White"'
	);
	expect(html).not.toContain(
		'aria-label="Override Red on White"'
	);

	palette.setPair(red, root, {});
});

test('a cell with several rules offers them as one extra option', () => {
	const [, role, series] = palette.roles;

	palette.rules = [
		...palette.rules,
		{id: 'a', fg: role.id, bg: series.id, use: 'body'},
		{id: 'b', fg: role.id, bg: series.id, use: 'large'}
	];

	const html = render(Result).body;

	expect(selected('Text on Series')).toBe(
		'Body text + Large text and UI'
	);
	expect(
		html.match(/<option[^>]*value="custom"/g)
	).toHaveLength(1);
	// one group for the cell, with each pair once
	const plain = text(html);

	expect(plain).toContain(
		'Text on Series · Body text + Large text and UI'
	);
	expect(plain.match(/Black &amp; Red/g)).toHaveLength(1);
	expect(plain.match(/Text on Series/g)).toHaveLength(1);

	palette.setRule(role.id, series.id);
	expect(selected('Text on Series')).toBe('—');
});
