import {expect, test} from 'vitest';
import {parseTree, serializeTree} from './presets';

test('serialized trees are restored with the same ids', () => {
	const tree = parseTree({
		type: 'clr',
		children: [
			{
				type: 'l',
				token: 'Dark $',
				isHidden: true,
				args: {amount: 20}
			}
		]
	});

	const restored = parseTree(serializeTree(tree));

	expect(serializeTree(restored)).toEqual(serializeTree(tree));
	expect(restored.children[0].id).toBe(tree.children[0].id);
});
