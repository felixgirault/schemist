import {
	type Culori,
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
}: Culori.Rgb): RgbColor => ({
	r: r * 255,
	g: g * 255,
	b: b * 255,
	a: alpha
});

export const rgbToCulori = ({
	r,
	g,
	b,
	a
}: RgbColor): Culori.Rgb => ({
	mode: 'rgb',
	r: r / 255,
	g: g / 255,
	b: b / 255,
	alpha: a
});

export const hslFromCulori = ({
	h,
	s,
	l,
	alpha
}: Culori.Hsl): HslColor => ({
	h,
	s: s * 100,
	l: l * 100,
	a: alpha
});

export const hslToCulori = ({
	h,
	s,
	l,
	a
}: HslColor): Culori.Hsl => ({
	mode: 'hsl',
	h,
	s: s / 100,
	l: l / 100,
	alpha: a
});

export const lchFromCulori = ({
	l,
	c,
	h,
	alpha
}: Culori.Lch): LchColor => ({
	l,
	c: (c / modeLch.ranges.c[1]) * 100,
	h,
	a: alpha
});

export const lchToCulori = ({
	l,
	c,
	h,
	a
}: LchColor): Culori.Lch => ({
	mode: 'lch',
	l,
	c: (c / 100) * modeLch.ranges.c[1],
	h,
	alpha: a
});

export const culoriLchToRgb = (color: Culori.Lch) =>
	convertLabToRgb(convertLchToLab(color));

export const culoriOkhslToOklch = (color: Culori.Okhsl) =>
	convertLabToLch(convertOkhslToOklab(color), 'oklch');

export const culoriOklchToRgb = (color: Culori.Oklch) =>
	convertOklabToRgb(convertLchToLab(color, 'oklab'));

export const culoriRgbToLch = (color: Culori.Rgb) =>
	convertLabToLch(convertRgbToLab(color));

export const culoriRgbToOkhsl = (color: Culori.Rgb) =>
	convertOklabToOkhsl(convertRgbToOklab(color));

export const culoriRgbToOklch = (color: Culori.Rgb) =>
	convertLabToLch(convertRgbToOklab(color), 'oklch');
