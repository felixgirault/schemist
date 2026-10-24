import {
	type Okhsl,
	type Rgb,
	clampChroma,
	clampRgb,
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
	const {h = 0} = culoriRgbToOklch(culoriRgb);
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
	const hsl: Okhsl = {
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

// Colors converted from sRGB can come back slightly out of gamut,
// due to rounding errors. Those are clipped instead of having
// their chroma clamped, because some lower chromas at the same
// lightness and hue are out of gamut too, near the corners of
// the gamut (e.g. #ffff00 would become #fffac0).
const gamutTolerance = 1e-4;

const isNearlyInGamut = ({r, g, b}: Rgb) =>
	[r, g, b].every(
		(c) => c >= -gamutTolerance && c <= 1 + gamutTolerance
	);

export const lchToSchemist = (
	color: LchColor
): SchemistColor => {
	const lch = lchToCulori(color);
	const rgb = culoriLchToRgb(lch);

	return rgbToSchemist(
		rgbFromCulori(
			isNearlyInGamut(rgb)
				? (clampRgb(rgb) as Rgb)
				: culoriLchToRgb(clampChroma(lch))
		)
	);
};

export const schemistToLch = (color: SchemistColor): LchColor =>
	lchFromCulori(
		culoriRgbToLch(rgbToCulori(schemistToRgb(color)))
	);
