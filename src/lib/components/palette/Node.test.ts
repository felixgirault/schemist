import {palette} from '#lib/stores/palette.svelte.js';
import {loadPalette, rootTree} from '#lib/testing/tree.js';
import {render} from 'svelte/server';
import {beforeEach, expect, test} from 'vitest';
import Node from './Node.svelte';

beforeEach(() => {
	palette.storedRoles = [];
});

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
	const lines = [...html.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map(
		([, line]) => line
	);

	expect(text(html)).toContain('3 colors');
	expect(html).toMatch(/<details[^>]* open/);
	expect(
		lines.map((line, i) =>
			text(line).trim().startsWith(names[i])
		)
	).toEqual([true, true, true]);
	// the Roles button is the only action
	expect(
		lines.every((line) => line.match(/<button/g)!.length === 1)
	).toBe(true);
});

test('a plain color has no list', () => {
	loadPalette(rootTree('#3b82f6', []));

	expect(
		render(Node, {props: {node: palette.root!}}).body
	).not.toContain('<details');
});

const named = (token: string) => ({type: 'l' as const, token});

const checkbox = (
	html: string,
	legend: string,
	role: string
) => {
	const fieldset = html
		.split('<fieldset')
		.find((part) => part.includes(`>${legend}</legend>`))!;

	return fieldset.match(
		new RegExp(`<input[^>]*/> ${role}</label>`)
	)![0];
};

test('writes roles on the label of a node and of a generated color', () => {
	loadPalette(
		rootTree('#3b82f6', [
			named('Ink'),
			{type: 'lsc', token: 'Step', args: {steps: 2}}
		])
	);

	const [ink, preset] = palette.root!.children;
	const [first] = Object.keys(preset.generated);
	const {name} = preset.generated[first];

	palette.addRole('Text', [ink.id, first]);
	palette.addRole('Borders', [ink.id]);

	const node = render(Node, {props: {node: ink}}).body;
	const lines = render(Node, {props: {node: preset}}).body;

	expect(text(node)).toContain('· Text, Borders');
	expect(text(lines)).toContain(`${name} · Text`);
	// ids with dots make valid, matching popover ids
	expect(lines).toContain(`popovertarget="${first}-roles"`);
	expect(lines).toContain(`id="${first}-roles"`);
	expect(node).toContain('Roles of Ink</legend>');
	expect(checkbox(node, 'Roles of Ink', 'Text')).toContain(
		'checked'
	);
	expect(
		checkbox(lines, `Roles of ${name}`, 'Borders')
	).not.toContain('checked');
	expect(lines).not.toContain(`id="${preset.id}-roles"`);
});

test('says to add a role in Targets when there is none', () => {
	loadPalette(rootTree('#3b82f6', [named('Ink')]));

	expect(
		text(
			render(Node, {props: {node: palette.root!.children[0]}})
				.body
		)
	).toContain('add one in Targets');
});

test('warns of a shared name only for a color with a role', () => {
	loadPalette(
		rootTree('#3b82f6', [named('Same'), named('Same')])
	);

	const [one, two] = palette.root!.children;

	palette.addRole('Text', [one.id]);

	expect(render(Node, {props: {node: one}}).body).toContain(
		'class="warning '
	);
	expect(render(Node, {props: {node: two}}).body).not.toContain(
		'class="warning '
	);
});

test('counts a single color', () => {
	loadPalette(
		rootTree('#3b82f6', [{type: 'lsc', args: {steps: 1}}])
	);

	expect(
		text(
			render(Node, {props: {node: palette.root!.children[0]}})
				.body
		)
	).toContain('1 color ');
});
