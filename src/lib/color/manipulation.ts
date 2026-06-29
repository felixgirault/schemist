import {
	circular,
	circularInterval,
	clamp,
	closestAngle
} from '$lib/utils/math';
import type {SchemistColor} from './types';

export const setHue = (color: SchemistColor, h: number) => ({
	...color,
	h
});

export const setSaturation = (
	color: SchemistColor,
	s: number
) => ({
	...color,
	s
});

export const setLightness = (
	color: SchemistColor,
	l: number
) => ({
	...color,
	l
});

export const rotateHue = (
	{h, ...color}: SchemistColor,
	degrees: number
) => ({
	...color,
	h: circular(h + degrees)
});

export const scaleLightness = (
	{h, l, ...color}: SchemistColor,
	amount: number,
	targetH: number,
	hueShiftAmount = 0
) => ({
	...color,
	l: clamp(l + amount, 100),
	h: hueShiftAmount
		? circularInterval(
				h,
				targetH,
				Math.abs(amount / 100) * (hueShiftAmount / 100)
			)
		: h
});

export const highlightColor = (
	color: SchemistColor,
	amount = 25,
	hueShiftAmount = 20
) =>
	scaleLightness(
		color,
		amount,
		rotateHue(color, 180).h,
		hueShiftAmount
	);

export const shadowColor = (
	color: SchemistColor,
	amount = 25,
	hueShiftAmount = 20
) =>
	scaleLightness(
		color,
		-amount,
		rotateHue(color, 180).h,
		hueShiftAmount
	);

export const contrastingColor = (
	{l, ...color}: SchemistColor,
	amount = 80
) => {
	const ratio = amount / 100;

	return {
		...color,
		l: clamp(l > 50 ? l - l * ratio : l + (100 - l) * ratio)
	};
};

export const closestHue = ({h}: SchemistColor, target: number) =>
	closestAngle(h, target, 15);

export const blueishColor = (
	color: SchemistColor,
	target = 244
) => setHue(color, closestHue(color, target));

export const greenishColor = (
	color: SchemistColor,
	target = 144
) => setHue(color, closestHue(color, target));

export const orangeishColor = (
	color: SchemistColor,
	target = 57
) => setHue(color, closestHue(color, target));

export const reddishColor = (
	color: SchemistColor,
	target = 25
) => setHue(color, closestHue(color, target));

export const randomUsableColor = (): SchemistColor => ({
	h: Math.round(Math.random() * 360),
	s: 50 + Math.random() * 50,
	l: 30 + Math.random() * 60
});
