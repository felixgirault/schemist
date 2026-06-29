import type {Hsl, Lch, Okhsl, Oklch, Rgb} from 'culori';
import {
	convertLabToLch,
	convertLabToRgb,
	convertLchToLab,
	convertOkhslToOklab,
	convertOklabToOkhsl,
	convertOklabToRgb,
	convertRgbToLab,
	convertRgbToOklab,
	modeLch,
	modeLrgb,
	useMode
} from 'culori/fn';
import type {HslColor, LchColor, RgbColor} from './types';

useMode(modeLch); // required by chroma clamping
useMode(modeLrgb); // required by contrast calculations

export const rgbFromCulori = ({
	r,
	g,
	b,
	alpha
}: Rgb): RgbColor => ({
	r: r * 255,
	g: g * 255,
	b: b * 255,
	a: alpha
});

export const rgbToCulori = ({r, g, b, a}: RgbColor): Rgb => ({
	mode: 'rgb',
	r: r / 255,
	g: g / 255,
	b: b / 255,
	alpha: a
});

export const hslFromCulori = ({
	h = 0,
	s,
	l,
	alpha
}: Hsl): HslColor => ({
	h,
	s: s * 100,
	l: l * 100,
	a: alpha
});

export const hslToCulori = ({h, s, l, a}: HslColor): Hsl => ({
	mode: 'hsl',
	h,
	s: s / 100,
	l: l / 100,
	alpha: a
});

export const lchFromCulori = ({
	l,
	c,
	h = 0,
	alpha
}: Lch): LchColor => ({
	l,
	c: (c / modeLch.ranges.c[1]) * 100,
	h,
	a: alpha
});

export const lchToCulori = ({l, c, h, a}: LchColor): Lch => ({
	mode: 'lch',
	l,
	c: (c / 100) * modeLch.ranges.c[1],
	h,
	alpha: a
});

export const culoriLchToRgb = (color: Lch) =>
	convertLabToRgb(convertLchToLab(color));

export const culoriOkhslToOklch = (color: Okhsl) =>
	convertLabToLch(convertOkhslToOklab(color), 'oklch');

export const culoriOklchToRgb = (color: Oklch) =>
	convertOklabToRgb(convertLchToLab(color));

export const culoriRgbToLch = (color: Rgb) =>
	convertLabToLch(convertRgbToLab(color));

export const culoriRgbToOkhsl = (color: Rgb) =>
	convertOklabToOkhsl(convertRgbToOklab(color));

export const culoriRgbToOklch = (color: Rgb) =>
	convertLabToLch(convertRgbToOklab(color), 'oklch');
