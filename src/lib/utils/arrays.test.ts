import {expect, test} from 'vitest';
import {unique, withoutIndex} from './arrays';

test('withoutIndex', () => {
	expect(withoutIndex([], 0)).toStrictEqual([]);
	expect(withoutIndex([1], 0)).toStrictEqual([]);
	expect(withoutIndex([1], 1)).toStrictEqual([1]);
	expect(withoutIndex([1, 2], 1)).toStrictEqual([1]);
});

test('unique', () => {
	expect(unique([])).toStrictEqual([]);
	expect(unique([1])).toStrictEqual([1]);
	expect(unique([1, 2])).toStrictEqual([1, 2]);
	expect(unique([1, 2, 2])).toStrictEqual([1, 2]);
});
