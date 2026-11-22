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

test('shows each rule with its specimen and status', () => {
	const html = text(render(Result).body);

	expect(html).toContain('Black: Pack my box');
	expect(html).toContain(
		'Black on White: met (WCAG 2 21 of 4.5, APCA 106 of 75)'
	);
	expect(html).toContain(
		'Grey on White: not met (WCAG 2 1.2 of 4.5'
	);
	expect(html).toContain('Red and Blue: met (Difference');
});

test('repeats the specimens per simulation', () => {
	combinations.blindnessTypes = ['protanomaly'];
	const html = render(Result).body;

	combinations.blindnessTypes = [];
	expect(html).toContain('Without simulation');
	expect(html).toContain('protanomaly');
});
