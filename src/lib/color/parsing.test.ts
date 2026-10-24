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

test('parseColor invalid', () => {
	expect(parseColor('#ab')).toEqual([]);
});
