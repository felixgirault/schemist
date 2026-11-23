import {parseColor} from '#lib/color/parsing.js';
import Result from '#lib/components/combinations/Result.svelte';
import {combinations} from '#lib/stores/combinations.svelte.js';
import {collectNodes} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {loadPalette, rootTree} from '#lib/testing/tree.js';
import {render} from 'svelte/server';
import {beforeAll, expect, test} from 'vitest';

// Grey text on White passes in Light and fails in Dark, where the
// background is overridden to a near-grey.
beforeAll(() => {
	loadPalette(
		rootTree('#ffffff', [
			{
				type: 'clr',
				token: 'Grey',
				args: {color: parseColor('#555555')[1]!}
			}
		])
	);
	const nodes = collectNodes(palette.root!);
	const surfaces = palette.addRole('Surfaces', [nodes[0].id]);
	const text = palette.addRole('Text', [nodes[1].id]);

	palette.addRule(text!, surfaces!, 'body');
	palette.addVariant();
	palette.selectVariant();
	nodes[0].overrides = {
		[palette.variants[1].id]: {
			color: parseColor('#666666')[1]!
		}
	};
	palette.settle();
});

// The text of the page, without tags and comments
const text = (html: string) =>
	html.replace(/<!--.*?-->|<[^>]*>/g, '').replace(/\s+/g, ' ');

test('counts each pair once per variant', () => {
	expect(combinations.checkedPairs).toBe(2);
	expect(combinations.passingPairs).toBe(1);
});

test('names the failing variant whichever is selected', () => {
	const {id} = palette.rules[0];

	palette.selectVariant(palette.variants[1].id);
	palette.settle();
	expect(combinations.ruleStatus(id).text).toBe(
		'not met in Dark'
	);
	palette.selectVariant();
	palette.settle();
	expect(combinations.ruleStatus(id).text).toBe(
		'not met in Dark'
	);
	expect(combinations.pairChecks.every((c) => c.pass)).toBe(
		true
	);
});

test('shows it in the rule, with the cards of Light', () => {
	const html = render(Result).body;

	expect(html).toContain('not met in Dark');
});

test('marks the card of a pair failing in another variant', () => {
	const {id} = combinations.pairChecks[0];

	expect(combinations.failingElsewhere(id)).toEqual(['Dark']);
	expect(text(render(Result).body)).toContain(
		'Not met in Dark'
	);

	palette.selectVariant(palette.variants[1].id);
	palette.settle();
	expect(combinations.failingElsewhere(id)).toEqual([]);
	palette.selectVariant();
	palette.settle();
});

test('counts a variant without colors yet from the next settle on', () => {
	const variants = palette.variants;

	// As undo restores one: no settle in between.
	palette.variants = [
		...variants,
		{id: 'vLater', name: 'Later'}
	];
	expect(combinations.checkedPairs).toBe(2);
	palette.settle();
	expect(combinations.checkedPairs).toBe(3);
	palette.variants = variants;
	palette.settle();
});

test('reads as before without variants', () => {
	palette.variants = [];
	palette.settle();
	expect(combinations.checkedPairs).toBe(1);
	expect(combinations.ruleStatus(palette.rules[0].id)).toEqual({
		pass: true,
		text: 'met'
	});
});

test('marks no card without variants, even a failing one', () => {
	loadPalette(
		rootTree('#ffffff', [
			{
				type: 'clr',
				token: 'Pale',
				args: {color: parseColor('#eeeeee')[1]!}
			}
		])
	);
	const [white, pale] = collectNodes(palette.root!);

	// Fresh names: the roles of the first palette are still there.
	const rule = palette.addRule(
		palette.addRole('Pale text', [pale.id])!,
		palette.addRole('Page', [white.id])!,
		'body'
	);
	const check = combinations.pairChecks.find(({pair}) =>
		pair.sources.rules.includes(rule)
	)!;

	expect(combinations.ruleStatus(rule).text).toBe('not met');
	expect(combinations.failingElsewhere(check.id)).toEqual([]);
	expect(text(render(Result).body)).not.toContain('Not met in');
});
