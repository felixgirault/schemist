import {expect, test} from 'vitest';
import {
	lchToSchemist,
	rgbToSchemist,
	schemistToLch,
	schemistToRgb
} from './conversion';
import {formatRgbToHex} from './formatting';

const channels = [0, 37, 128, 200, 255];
const colors = channels.flatMap((r) =>
	channels.flatMap((g) => channels.map((b) => ({r, g, b})))
);

test.each(colors)('rgb → lch → rgb %j', (color) => {
	const lch = schemistToLch(rgbToSchemist(color));
	expect(
		formatRgbToHex(schemistToRgb(lchToSchemist(lch)))
	).toBe(formatRgbToHex(color));
});

test('clamps the chroma of out of gamut colors', () => {
	const color = schemistToLch(
		lchToSchemist({l: 80, c: 100, h: 30})
	);

	expect(color.l).toBeCloseTo(80, 1);
	expect(color.h).toBeCloseTo(30, 0);
	expect(color.c).toBeLessThan(100);
});
