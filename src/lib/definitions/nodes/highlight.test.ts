import {parseColor} from '#lib/color/parsing.js';
import {expect, test} from 'vitest';
import highlight from './highlight';

test('temperature affects the highlight hue', () => {
	const color = parseColor('#3366cc')[1]!;
	const apply = (temp: number) =>
		highlight.apply(color, {amount: 30, shift: 100, temp});

	expect(apply(550).h).not.toBeCloseTo(apply(750).h);
});
