import {palette} from '#lib/stores/palette.svelte.js';
import {rootTree} from '#lib/testing/tree.js';
import {parseTree} from '#lib/tree.js';
import {render} from 'svelte/server';
import {beforeAll, expect, test} from 'vitest';
import Node from './Node.svelte';
import NodeOptions from './NodeOptions.svelte';
import VariantSwitch from './VariantSwitch.svelte';

const text = (html: string) =>
	html.replace(/<!--.*?-->|<[^>]*>/g, '').replace(/\s+/g, ' ');

beforeAll(() => {
	palette.root = parseTree(
		rootTree('#3b82f6', [
			{type: 'l', args: {amount: 10}},
			{type: 'lsc'}
		])
	);
	palette.addVariant();
});

test('lists the variants as toggles, the selected one pressed', () => {
	const html = render(VariantSwitch).body;

	expect(html).toContain('aria-pressed="true"');
	expect(html).toContain('aria-pressed="false"');
	expect(text(html)).toContain('LightDark +');
	expect(text(html)).toContain('Delete Dark');
});

test('marks a node with an override and offers to reset it', () => {
	const [node, other] = palette.root!.children;

	expect(render(Node, {props: {node}}).body).not.toContain(
		'Overridden in this variant'
	);

	node.setArg('amount', 40);

	const html = render(Node, {props: {node}}).body;

	expect(html).toContain('Overridden in this variant');
	expect(
		text(render(NodeOptions, {props: {id: 'o', node}}).body)
	).toContain('Reset to Light (');
	expect(
		render(Node, {props: {node: other}}).body
	).not.toContain('Overridden in this variant');
});

test('disables structural params in a variant, with a hint', () => {
	const node = palette.root!.children[1];
	const html = render(NodeOptions, {
		props: {id: 'o', node}
	}).body;

	expect(html).toContain('disabled');
	expect(text(html)).toContain('is the same in every variant');
});
