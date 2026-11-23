import {parseColor} from '#lib/color/parsing.js';
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

	palette.addRule(text!, surfaces!, 'body');
	palette.addRule(series!, undefined, 'categories');
});

// The text of the page, without tags and comments
const text = (html: string) =>
	html.replace(/<!--.*?-->|<[^>]*>/g, '').replace(/\s+/g, ' ');

test('shows each rule with its cards', () => {
	const html = text(render(Result).body);

	expect(html).not.toContain('Pack my box');
	expect(html).toContain(
		'Black &amp; White AAA (21) met APCA 5 (106) met'
	);
	expect(html).toContain('Grey &amp; White KO (1.2) not met');
	expect(html).toMatch(
		/(Red|Blue) &amp; (Blue|Red) Difference \([\d.]+\) met/
	);
});

test('shows the simulations in the cards, once', () => {
	combinations.blindnessTypes = ['protanomaly'];
	const html = render(Result).body;
	const plain = text(html);

	combinations.blindnessTypes = [];
	expect(plain).toContain('protanomaly');
	expect(plain).not.toContain('Without simulation');
	expect(plain.split('Black &amp; White').length).toBe(2);
});

test('previews a pair, declared or not', () => {
	combinations.previewedUid = `${palette.root!.id}-${id('Black')}`;
	const previewed = combinations.previewed;

	combinations.previewedUid = null;
	expect(previewed?.fgName).toBe('Black');
	expect(previewed?.bgName).toBe('White');
	expect(combinations.previewed).toBeNull();
});

test('shows a row per role, with its rules and colors', () => {
	const html = render(Result).body;
	const plain = text(html);

	expect(html).toContain('aria-label="Role name" value="Text"');
	expect(plain).toContain('on Surfaces · Body text');
	expect(plain).toContain('among themselves · Categories');
	expect(plain).toContain('used by Text on Surfaces');
	expect(html).toContain('aria-label="Delete role Text"');
	expect(html).toContain('aria-label="Add a color to Series"');
	expect(html).toContain('aria-label="Remove Black from Text"');
	expect(html).toContain('+ Role');
});
