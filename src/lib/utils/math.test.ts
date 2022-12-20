import {expect, test} from 'vitest';
import {
	circular,
	circularInterval,
	clamp,
	closestAngle,
	interval,
	round
} from './math';

test('round', () => {
	expect(round(1.234, 0)).toBe(1);
	expect(round(1.234, 1)).toBe(1.2);
	expect(round(3.456, 2)).toBe(3.46);
});

test('clamp', () => {
	expect(clamp(10, 100, 0)).toBe(10);
	expect(clamp(-10, 100, 0)).toBe(0);
	expect(clamp(10, 5, 0)).toBe(5);
});

test('circular', () => {
	expect(circular(100)).toBe(100);
	expect(circular(-10)).toBe(350);
	expect(circular(370)).toBe(10);
});

test('interval', () => {
	expect(interval(0, 100, 0)).toBe(0);
	expect(interval(0, 100, 0.5)).toBe(50);
	expect(interval(0, 100, 1)).toBe(100);
});

test('circularInterval', () => {
	expect(circularInterval(180, 270, 0)).toBe(180);
	expect(circularInterval(180, 270, 0.5)).toBe(225);
	expect(circularInterval(180, 270, 1)).toBe(270);

	expect(circularInterval(180, 90, 0)).toBe(180);
	expect(circularInterval(180, 90, 0.5)).toBe(135);
	expect(circularInterval(180, 90, 1)).toBe(90);

	expect(circularInterval(350, 30, 0.5)).toBe(10);
	expect(circularInterval(30, 350, 0.5)).toBe(10);
});

test('closestAngle', () => {
	expect(closestAngle(0, 100, 10)).toBe(100);
	expect(closestAngle(0, 99, 10)).toBe(100);
	expect(closestAngle(0, 91, 10)).toBe(90);
});
