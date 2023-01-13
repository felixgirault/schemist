import {
	type Culori,
	clampChroma,
	convertHslToRgb,
	convertRgbToHsl
} from 'culori/fn';
import {
	culoriLchToRgb,
	culoriOkhslToOklch,
	culoriOklchToRgb,
	culoriRgbToLch,
	culoriRgbToOkhsl,
	culoriRgbToOklch,
	hslFromCulori,
	hslToCulori,
	lchFromCulori,
	lchToCulori,
	rgbFromCulori,
	rgbToCulori
} from './culori';
import type {
	HslColor,
	LchColor,
	RgbColor,
	SchemistColor
} from './types';

export const rgbToSchemist = (
	color: RgbColor
): SchemistColor => {
	const culoriRgb = rgbToCulori(color);
	const {h} = culoriRgbToOklch(culoriRgb);
	const {s, l} = culoriRgbToOkhsl(culoriRgb);

	return {
		h,
		s: s * 100,
		l: l * 100,
		a: color.a
	};
};

export const schemistToRgb = ({
	h,
	s,
	l,
	a
}: SchemistColor): RgbColor => {
	const hsl: Culori.Okhsl = {
		mode: 'okhsl',
		h,
		s: s / 100,
		l: l / 100
	};

	return rgbFromCulori(
		culoriOklchToRgb({
			...culoriOkhslToOklch(hsl),
			h,
			alpha: a
		})
	);
};

export const hslToSchemist = (color: HslColor): SchemistColor =>
	rgbToSchemist(
		rgbFromCulori(convertHslToRgb(hslToCulori(color)))
	);

export const schemistToHsl = (color: SchemistColor): HslColor =>
	hslFromCulori(
		convertRgbToHsl(rgbToCulori(schemistToRgb(color)))
	);

export const lchToSchemist = (color: LchColor): SchemistColor =>
	rgbToSchemist(
		rgbFromCulori(
			culoriLchToRgb(clampChroma(lchToCulori(color)))
		)
	);

export const schemistToLch = (color: SchemistColor): LchColor =>
	lchFromCulori(
		culoriRgbToLch(rgbToCulori(schemistToRgb(color)))
	);
