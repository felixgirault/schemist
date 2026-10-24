import {unpack} from '#lib/packing/index.js';
import {expect, test} from 'vitest';
import {permalink} from './routing';

test.each([
	'Info, light',
	'a@b',
	'R&D',
	'#1 + 2',
	'100%',
	'On $'
])('permalinks preserve token %j', (token) => {
	const tree = {type: 'l' as const, token, args: {amount: 40}};
	const url = new URL(
		permalink(tree, 'https://schemist.fglt.fr')
	);

	expect(unpack(url.searchParams.get('preset')!)).toMatchObject(
		tree
	);
});
