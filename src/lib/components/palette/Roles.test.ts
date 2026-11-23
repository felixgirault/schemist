import {parseColor} from '#lib/color/parsing.js';
import {collectNodes} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {loadPalette, rootTree} from '#lib/testing/tree.js';
import {render} from 'svelte/server';
import {expect, test} from 'vitest';
import Roles from './Roles.svelte';

test('shows a row per role with its colors', () => {
	loadPalette(
		rootTree('#ffffff', [
			{
				type: 'clr',
				token: 'Black',
				args: {color: parseColor('#000000')[1]!}
			}
		])
	);
	const black = collectNodes(palette.root!).find(
		({token}) => token === 'Black'
	)!;

	palette.addRole('Text', [black.id]);
	palette.addRole('Series');

	const html = render(Roles).body;

	expect(html).toContain('>Roles</h2>');
	expect(html).toContain('aria-label="Role name" value="Text"');
	expect(html).toContain('aria-label="Remove Black from Text"');
	expect(html).toContain('aria-label="Add a color to Series"');
	expect(html).toContain('+ Role');
	// after the colors' list, apart from the chips
	expect(html.indexOf('Add a color to Text')).toBeLessThan(
		html.indexOf('Delete role Text')
	);
});
