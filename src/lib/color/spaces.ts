import type {
	Color,
	Definition,
	Hsl,
	Lch,
	Okhsl,
	Rgb
} from 'culori/fn';
import {
	clampChroma,
	formatCss,
	formatHex,
	modeHsl,
	modeLch,
	modeLrgb,
	modeOkhsl,
	modeOklch,
	modeRgb,
	parse,
	parseHex,
	useMode
} from 'culori/fn';
import {clamp, round} from '$lib/utils/math';

export interface SchemistColor extends Color {
	mode: 'schemist';
	h: number;
	s: number;
	l: number;
}

export interface Rgb255 extends Color {
	mode: 'rgb255';
	r: number;
	g: number;
	b: number;
}

export interface Hsl100 extends Color {
	mode: 'hsl100';
	h: number;
	s: number;
	l: number;
}

export interface Lch100 extends Color {
	mode: 'lch100';
	l: number;
	c: number;
	h: number;
}

export const toRgb255 = ({r, g, b, alpha}: Rgb): Rgb255 => ({
	mode: 'rgb255',
	r: r * 255,
	g: g * 255,
	b: b * 255,
	alpha
});

export const fromRgb255 = ({r, g, b, alpha}: Rgb255): Rgb => ({
	mode: 'rgb',
	r: r / 255,
	g: g / 255,
	b: b / 255,
	alpha
});

export const toHsl100 = ({h, s, l, alpha}: Hsl): Hsl100 => ({
	mode: 'hsl100',
	h,
	s: s * 100,
	l: l * 100,
	alpha
});

export const fromHsl100 = ({h, s, l, alpha}: Hsl100): Hsl => ({
	mode: 'hsl',
	h,
	s: s / 100,
	l: l / 100,
	alpha
});

export const toLch100 = ({l, c, h, alpha}: Lch): Lch100 => ({
	mode: 'lch100',
	l,
	c: (c / modeLch.ranges.c[1]) * 100,
	h,
	alpha
});

export const fromLch100 = ({l, c, h, alpha}: Lch100): Lch => ({
	mode: 'lch',
	l,
	c: (c / 100) * modeLch.ranges.c[1],
	h,
	alpha
});

const modeSchemist: Definition<SchemistColor> = {
	mode: 'schemist',
	channels: ['h', 's', 'l'],
	ranges: {
		h: [0, 360],
		s: [0, 100],
		l: [0, 100]
	},
	interpolate: {
		h: modeOklch.interpolate.h,
		s: modeOkhsl.interpolate.s,
		l: modeOkhsl.interpolate.l
	},
	toMode: {
		rgb: ({h, s, l, alpha}: SchemistColor) => {
			const hsl: Okhsl = {
				mode: 'okhsl',
				h,
				s: s / 100,
				l: l / 100
			};

			const lch = modeOklch.fromMode.oklab(
				modeOkhsl.toMode.oklab(hsl)
			);

			return modeOklch.toMode.rgb({...lch, h, alpha});
		}
	},
	fromMode: {
		rgb: (color: Rgb) => {
			const {h} = modeOklch.fromMode.rgb(color);
			const {s, l} = modeOkhsl.fromMode.rgb(color);

			return {
				mode: 'schemist',
				h,
				s: s * 100,
				l: l * 100,
				alpha: color.alpha
			};
		}
	}
};

export const rgbColor = useMode(modeRgb);
export const lrgbColor = useMode(modeLrgb);
export const hslColor = useMode(modeHsl);
export const lchColor = useMode(modeLch);
export const schemistColor = useMode(modeSchemist);

const converters = {
	rgb: rgbColor,
	lrgb: lrgbColor,
	hsl: hslColor,
	lch: lchColor,
	schemist: schemistColor
};

export const convertColor = (color, mode) =>
	converters[mode](color);

export const parseColor = parse;
export const isHexColor = (color: any) =>
	typeof color === 'string' && !!parseHex(color);

export const hexColor = formatHex;

export const cssColor = (
	color: Color,
	precision = 3
): string => {
	switch (color.mode) {
		case 'schemist':
			return 'alpha' in color
				? cssColor(rgbColor(clampChroma(color)))
				: hexColor(clampChroma(color));

		case 'rgb': {
			const {
				r = 0,
				g = 0,
				b = 0,
				alpha = 1
			} = toRgb255(color as Rgb);

			const rr = round(r, precision);
			const rg = round(g, precision);
			const rb = round(b, precision);
			const a = round(clamp(alpha, 1), precision);
			return a < 1
				? `rgba(${rr}, ${rg}, ${rb}, ${a})`
				: `rgb(${rr}, ${rg}, ${rb})`;
		}

		case 'hsl': {
			const {h = 0, s, l} = color as Hsl;

			return `hsl(${round(h, precision)} ${
				s === undefined
					? 'none'
					: round(s * 100, precision) + '%'
			} ${
				l === undefined
					? 'none'
					: round(l * 100, precision) + '%'
			})`;
		}

		case 'lch': {
			const {l, c, h = 0} = color as Lch;

			return `lch(${
				l === undefined ? 'none' : round(l, precision) + '%'
			} ${
				c === undefined ? 'none' : round(c, precision)
			} ${round(h, precision)})`;
		}

		default:
			return formatCss(color);
	}
};
