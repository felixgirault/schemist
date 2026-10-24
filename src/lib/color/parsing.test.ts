import {formatSchemistToHex} from '#lib/color/formatting.js';
import {expect, test} from 'vitest';
import {parseColor} from './parsing';

test.each([
	['#abc', 'hex', '#aabbcc'],
	['red', 'rgb', '#ff0000'],
	['rgb(10 20 30)', 'rgb', '#0a141e'],
	['hsl(120 100% 50%)', 'hsl', '#00ff00'],
	['lch(50% 0 0)', 'lch', '#777777']
])('parseColor %s', (input, format, hex) => {
	const [parsedFormat, color] = parseColor(input);
	expect(parsedFormat).toBe(format);
	expect(formatSchemistToHex(color!)).toBe(hex);
});

// Missing channels are treated as 0.
// @see https://drafts.csswg.org/css-color/#missing
test.each([
	['rgb(none 20 30)', 'rgb(0 20 30)'],
	['hsl(120 none 50%)', 'hsl(120 0% 50%)'],
	['lch(50 none 30)', 'lch(50 0 30)'],
	['lch(none 30 30)', 'lch(0 30 30)']
])('parseColor %s', (input, equivalent) => {
	expect(parseColor(input)).toEqual(parseColor(equivalent));
});

test('parseColor invalid', () => {
	expect(parseColor('#ab')).toEqual([]);
});
