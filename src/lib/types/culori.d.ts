// @see https://github.com/akx/gradient/blob/master/src/culori.d.ts
declare module 'culori/fn' {
	export interface Color {
		mode: string;
		alpha?: number;
		[component: string]: string | number;
	}

	export interface Rgb extends Color {
		mode: 'rgb';
		r: number;
		g: number;
		b: number;
	}

	export interface Lrgb extends Color {
		mode: 'lrgb';
		r: number;
		g: number;
		b: number;
	}

	export interface Hsl extends Color {
		mode: 'hsl';
		h: number;
		s: number;
		l: number;
	}

	export interface Lch extends Color {
		mode: 'lch';
		l: number;
		c: number;
		h: number;
	}

	export interface Okhsl extends Color {
		mode: 'okhsl';
		h: number;
		s: number;
		l: number;
	}

	export interface Oklch extends Color {
		mode: 'oklch';
		l: number;
		c: number;
		h: number;
	}

	type Definition<T extends Color> = {
		mode: string;
		channels: string[];
		ranges: {
			[channel: string]: [number, number];
		};
		interpolate: {
			[channel: string]: any;
		};
		toMode: {
			[mode: string]: (color: T) => Color;
		};
		fromMode: {
			[mode: string]: (color: Color) => T;
		};
	};

	type DefinitionColor<T> = T extends Definition<infer C>
		? C
		: never;

	type Converter<Converted extends Color = Color> = (
		color: string | Color
	) => Converted;

	export function clampChroma<T extends Color>(
		color: T,
		mode?: string
	): T;

	export function parse(color: string): Color | null;
	export function parseHex(color: any): string | null;

	export function formatHex(color: any): string | null;
	export function formatCss(color: any): string | null;

	export function useMode<D extends Definition<T>>(
		mode: D
	): Converter<DefinitionColor<D>>;

	export function wcagContrast(
		color: Color,
		color: Color
	): number;

	export const modeRgb: Definition<Rgb>;
	export const modeLrgb: Definition<Lrgb>;
	export const modeHsl: Definition<Hsl>;
	export const modeLch: Definition<Lch>;
	export const modeOkhsl: Definition<Okhsl>;
	export const modeOklch: Definition<Oklch>;

	export function filterDeficiencyProt(
		severity?: number
	): (color: Color) => Rgb;

	export function filterDeficiencyDeuter(
		severity?: number
	): (color: Color) => Rgb;

	export function filterDeficiencyTrit(
		severity?: number
	): (color: Color) => Rgb;
}
