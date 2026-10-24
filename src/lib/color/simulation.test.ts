import {expect, test} from 'vitest';
import {wcag3Contrast} from './contrast';
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
