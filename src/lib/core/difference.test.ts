import type {RgbColor} from '#lib/color/types.js';
import {differenceCiede2000} from 'culori/fn';
import {expect, test} from 'vitest';
import {difference} from './difference';

const rgb = (r: number, g: number, b: number): RgbColor => ({
	r,
	g,
	b,
	a: 1
});

const red = rgb(200, 60, 60);
const green = rgb(60, 150, 60);

test('identical colors have no difference', () => {
	expect(difference(red, red, ['deuteranomaly']).minLevel).toBe(
		0
	);
});

test('difference is symmetric', () => {
	expect(difference(red, green, []).level).toBeCloseTo(
		difference(green, red, []).level,
		10
	);
});

test('black and white differ by about 100', () => {
	expect(
		difference(rgb(0, 0, 0), rgb(255, 255, 255), []).level
	).toBeCloseTo(100, 0);
});

// Sharma, Wu & Dalal (2005) test data. Lab values carry no
// illuminant, so this checks the formula and the lab65 mode.
test.each([
	[[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
	[[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
	[[50, 2.8361, -74.02], [50, 0, -82.7485], 3.4412],
	[[50, -1.3802, -84.2814], [50, 0, -82.7485], 1],
	[[50, 2.5, 0], [50, 0, -2.5], 4.3065]
])('Sharma pair %j / %j', (x, y, expected) => {
	const lab = ([l, a, b]: number[]) => ({
		mode: 'lab65' as const,
		l,
		a,
		b
	});
	expect(differenceCiede2000()(lab(x), lab(y))).toBeCloseTo(
		expected,
		4
	);
});

test('simulations are listed in order, minLevel is the lowest', () => {
	const result = difference(red, green, [
		'tritanomaly',
		'protanomaly'
	]);
	expect(result.simulated.map((s) => s.type)).toEqual([
		'tritanomaly',
		'protanomaly'
	]);
	expect(result.minLevel).toBe(
		Math.min(
			result.level,
			...result.simulated.map((s) => s.level)
		)
	);
});

test('a red and a green get closer under deuteranomaly', () => {
	const result = difference(red, green, ['deuteranomaly']);
	expect(result.simulated[0].level).toBeLessThan(result.level);
	expect(result.minLevel).toBe(result.simulated[0].level);
});
