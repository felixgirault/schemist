import {expect, test} from 'vitest';
import {omit} from './objects';

test('omit', () => {
	expect(omit({}, 'a')).toStrictEqual({});
	expect(omit({a: 1, b: 2}, 'a')).toStrictEqual({b: 2});
	expect(omit({a: 1, b: 2}, 'c')).toStrictEqual({a: 1, b: 2});
});
