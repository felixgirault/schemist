import {formatHex as culoriFormatHex} from 'culori/fn';
import {clamp, round} from '$lib/utils/math';
import {
	schemistToHsl,
	schemistToLch,
	schemistToRgb
} from './conversion';
import {rgbToCulori} from './culori';
import type {
	HslColor,
	LchColor,
	RgbColor,
	SchemistColor
} from './types';

export type ColorFormat = 'hex' | 'hsl' | 'lch' | 'rgb';

export const formatRgb = (
	{r, g, b, a = 1}: RgbColor,
	precision = 3
) => {
	const rr = round(r, precision);
	const rg = round(g, precision);
	const rb = round(b, precision);
	const ra = round(clamp(a, 1), precision);
	return ra < 1
		? `rgba(${rr}, ${rg}, ${rb}, ${ra})`
		: `rgb(${rr}, ${rg}, ${rb})`;
};

export const formatRgbToHex = (color: RgbColor) =>
	culoriFormatHex(rgbToCulori(color));

export const formatHsl = (
	{h = 0, s, l}: HslColor,
	precision = 3
) =>
	`hsl(${round(h, precision)} ${
		s === undefined ? 'none' : round(s, precision) + '%'
	} ${l === undefined ? 'none' : round(l, precision) + '%'})`;

export const formatLch = (
	{l, c, h = 0}: LchColor,
	precision = 3
) =>
	`lch(${
		l === undefined ? 'none' : round(l, precision) + '%'
	} ${c === undefined ? 'none' : round(c, precision)} ${round(
		h,
		precision
	)})`;

export const formatSchemistToHex = (color: SchemistColor) =>
	formatRgbToHex(schemistToRgb(color));

export const formatSchemist = (
	color: SchemistColor,
	precision = 3
) =>
	color?.a !== undefined
		? formatRgb(schemistToRgb(color), precision)
		: formatSchemistToHex(color);

export const formatSchemistTo = (
	color: SchemistColor,
	format: ColorFormat,
	precision = 3
) =>
	format === 'hex'
		? formatSchemistToHex(color)
		: format === 'hsl'
		? formatHsl(schemistToHsl(color), precision)
		: format === 'lch'
		? formatLch(schemistToLch(color), precision)
		: formatRgb(schemistToRgb(color), precision);
