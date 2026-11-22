import {expect, test} from 'vitest';
import {UsageError} from './errors.js';
import {parsePair} from './pair.js';

test.each([
	['Brand text/Brand light', ['Brand text', 'Brand light']],
	['a\\/b/c', ['a/b', 'c']],
	['a/b\\/c', ['a', 'b/c']],
	['a\\\\/b', ['a\\', 'b']],
	['a\\\\\\/b/c', ['a\\/b', 'c']],
	['a\\b/c', ['a\\b', 'c']],
	['/b', ['', 'b']]
])('parses %j', (value, expected) => {
	expect(parsePair(value)).toEqual(expected);
});

test.each([
	['abc', 'expected fg/bg'],
	['', 'expected fg/bg'],
	['a/b/c', 'expected fg/bg'],
	['a\\/b', 'expected fg/bg']
])('rejects %j', (value, message) => {
	expect(() => parsePair(value)).toThrow(UsageError);
	expect(() => parsePair(value)).toThrow(message);
	expect(() => parsePair(value)).toThrow(`"${value}"`);
});
