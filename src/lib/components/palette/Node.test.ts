import {palette} from '#lib/stores/palette.svelte.js';
import {loadPalette, rootTree} from '#lib/testing/tree.js';
import {render} from 'svelte/server';
import {expect, test} from 'vitest';
import Node from './Node.svelte';

const text = (html: string) =>
	html.replace(/<!--.*?-->|<[^>]*>/g, '').replace(/\s+/g, ' ');

test("lists a preset's colors in order, with names and no action", () => {
	loadPalette(
		rootTree('#3b82f6', [
			{type: 'lsc', token: 'Step', args: {steps: 3}}
		])
	);

	const preset = palette.root!.children[0];
	const names = Object.values(preset.generated).map(
		({name}) => name
	);
	const html = render(Node, {props: {node: preset}}).body;
	const lines = [...html.matchAll(/<li>(.*?)<\/li>/g)].map(
		([, line]) => line
	);

	expect(text(html)).toContain('3 colors');
	expect(html).toMatch(/<details[^>]* open/);
	expect(lines.map((line) => text(line).trim())).toEqual(names);
	expect(lines.every((line) => !line.includes('<button'))).toBe(
		true
	);
});

test('a plain color has no list', () => {
	loadPalette(rootTree('#3b82f6', []));

	expect(
		render(Node, {props: {node: palette.root!}}).body
	).not.toContain('<details');
});
