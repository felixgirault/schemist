import {expect, test} from 'vitest';
import {formatSchemist} from '$lib/color/formatting';
import {parseColor} from '$lib/color/parsing';
import type {SchemistColor} from '$lib/color/types';
import {
	continuousGradient,
	discreteGradient,
	joinProperties
} from './css';

test('continuousGradient', () => {
	const color1 = parseColor('#000')[1] as SchemistColor;
	const color2 = parseColor('#111')[1] as SchemistColor;

	expect(continuousGradient([color1, color2])).toBe(
		`linear-gradient(90deg, ${formatSchemist(
			color1
		)} 0%, ${formatSchemist(color2)} 50%)`
	);
});

test('discreteGradient', () => {
	const color1 = parseColor('#000')[1] as SchemistColor;
	const color2 = parseColor('#111')[1] as SchemistColor;
	const color3 = parseColor('#222')[1] as SchemistColor;
	const color4 = parseColor('#333')[1] as SchemistColor;

	expect(
		discreteGradient([color1, color2, color3, color4])
	).toBe(
		`linear-gradient(90deg, ${formatSchemist(
			color1
		)} 0% 25%, ${formatSchemist(
			color2
		)} 25% 50%, ${formatSchemist(
			color3
		)} 50% 75%, ${formatSchemist(color4)} 75% 100%)`
	);
});

test('joinProperties', () => {
	expect(
		joinProperties({
			display: 'block',
			width: '100%'
		})
	).toBe('display: block; width: 100%');
});
