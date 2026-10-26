import {unpack} from '#lib/packing/index.js';
import {parseTree} from '#lib/tree.js';
import {expect, test, vi} from 'vitest';
import {permalink} from './routing';

vi.stubGlobal('window', {
	location: {origin: 'https://schemist.fglt.fr'}
});

test.each([
	'Info, light',
	'a@b',
	'R&D',
	'#1 + 2',
	'100%',
	'On $'
])('permalinks preserve token %j', (token) => {
	const tree = {type: 'l' as const, token, args: {amount: 40}};
	const url = new URL(permalink(parseTree(tree)));

	expect(unpack(url.searchParams.get('preset')!)).toMatchObject(
		tree
	);
});
