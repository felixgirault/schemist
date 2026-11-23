import {expect, test} from 'vitest';
import {wcag3Contrast} from './contrast';
import {schemistToRgb} from './conversion';
import {parseColor} from './parsing';

const rgb = (hex: string) => schemistToRgb(parseColor(hex)[1]!);

// Levels of the exact sRGB channels, from apca-w3
test.each([
	['#ff0000', '#ffffff', 64.1],
	['#0000ff', '#ffffff', 85.8],
	['#ffff00', '#000000', 102.7],
	['#ffffff', '#ff0000', 69.6]
])(
	'APCA of %s on %s, channels slightly out of range',
	(fg, bg, level) => {
		expect(wcag3Contrast(rgb(bg), rgb(fg))).toBeCloseTo(
			level,
			1
		);
	}
);
