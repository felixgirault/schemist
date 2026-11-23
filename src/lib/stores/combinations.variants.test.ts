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

test('reads as before without variants', () => {
	palette.variants = [];
	palette.settle();
	expect(combinations.checkedPairs).toBe(1);
	expect(combinations.ruleStatus(palette.rules[0].id)).toEqual({
		pass: true,
		text: 'met'
	});
});
