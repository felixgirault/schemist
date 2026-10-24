import {expect, test} from 'vitest';
import {wcag3Contrast} from './contrast';
import {formatRgbToHex} from './formatting';
import {
	simulateDeuteranomaly,
	simulateProtanomaly,
	simulateTritanomaly
} from './simulation';

// colors from issue #46
const dark = {r: 11, g: 75, b: 108, a: 1};
const light = {r: 250, g: 253, b: 255, a: 1};

test.each([
	['protanomaly', simulateProtanomaly],
	['deuteranomaly', simulateDeuteranomaly],
	['tritanomaly', simulateTritanomaly]
] as const)(
	'%s stays in gamut and keeps APCA contrast',
	(_, simulate) => {
		const bg = simulate(dark);
		const fg = simulate(light);

		for (const v of [bg.r, bg.g, bg.b, fg.r, fg.g, fg.b]) {
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThanOrEqual(255);
		}

		expect(wcag3Contrast(bg, fg)).toBeGreaterThan(80);
	}
);

// Machado et al. matrices apply to linear RGB.
test.each([
	['protanomaly', simulateProtanomaly, '#6d5f00'],
	['deuteranomaly', simulateDeuteranomaly, '#a39000'],
	['tritanomaly', simulateTritanomaly, '#ff000f']
] as const)('%s of red', (_, simulate, hex) => {
	expect(formatRgbToHex(simulate({r: 255, g: 0, b: 0}))).toBe(
		hex
	);
});

test.each([
	simulateProtanomaly,
	simulateDeuteranomaly,
	simulateTritanomaly
])('keeps grays', (simulate) => {
	const gray = {r: 128, g: 128, b: 128};
	expect(formatRgbToHex(simulate(gray))).toBe('#808080');
});
