import {expect, test} from 'vitest';
import {range, uid} from './generators';

test('uid', () => {
	expect(uid()).toBe(0);
	expect(uid()).toBe(1);
	expect(uid()).toBe(2);
});

test('range', () => {
	expect(range(0)).toStrictEqual([]);
	expect(range(5)).toStrictEqual([0, 1, 2, 3, 4]);
});
