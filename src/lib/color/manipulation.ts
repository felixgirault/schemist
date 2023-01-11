import {
	circular,
	circularInterval,
	clamp,
	closestAngle
} from '$lib/utils/math';
import {rgbToSchemist} from './conversion';
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
	hueShiftAmount = 15,
	temp: number
) =>
	scaleLightness(
		color,
		amount,
		temperatureToHue(temp),
		hueShiftAmount
	);

export const shadowColor = (
	color: SchemistColor,
	amount = 25,
	hueShiftAmount = 15,
	temp: number
) =>
	scaleLightness(
		color,
		-amount,
		circular(temperatureToHue(temp) + 180),
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

// @see http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code
// @see https://gist.github.com/EDais/1ba1be0fe04eca66bbd588a6c9cbd666
export const temperatureToHue = (kelvins: number): number => {
	const temperature = clamp(kelvins, 40000, 1000) / 100;
	const r =
		temperature <= 66
			? 255
			: clamp(
					329.698727446 *
						Math.pow(temperature - 60, -0.1332047592),
					255
			  );

	const g =
		temperature <= 66
			? clamp(
					99.4708025861 * Math.log(temperature) -
						161.1195681661,
					255
			  )
			: clamp(
					288.1221695283 *
						Math.pow(temperature - 60, -0.0755148492),
					255
			  );

	const b =
		temperature >= 66
			? 255
			: temperature <= 19
			? 0
			: clamp(
					138.5177312231 * Math.log(temperature - 10) -
						305.0447927307,
					255
			  );

	const color = rgbToSchemist({
		r: Math.round(r),
		g: Math.round(g),
		b: Math.round(b)
	});

	// @TODO undefined HUE at 6600K
	// return 95.09736692688655; // temperatureToHue(6504)

	return color.h;
};
