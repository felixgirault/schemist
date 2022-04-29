import {cssColor, schemistColor} from '$lib/color/spaces';
import {
	continuousGradient,
	discreteGradient,
	joinProperties
} from './css';

test('continuousGradient', () => {
	const color1 = schemistColor('#000');
	const color2 = schemistColor('#111');

	expect(continuousGradient([color1, color2])).toBe(
		`linear-gradient(90deg, ${cssColor(color1)} 0%, ${cssColor(
			color2
		)} 50%)`
	);
});

test('discreteGradient', () => {
	const color1 = schemistColor('#000');
	const color2 = schemistColor('#111');
	const color3 = schemistColor('#222');
	const color4 = schemistColor('#333');

	expect(
		discreteGradient([color1, color2, color3, color4])
	).toBe(
		`linear-gradient(90deg, ${cssColor(
			color1
		)} 0% 25%, ${cssColor(color2)} 25% 50%, ${cssColor(
			color3
		)} 50% 75%, ${cssColor(color4)} 75% 100%)`
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
