// @see https://github.com/akx/gradient/blob/master/src/culori.d.ts
declare module 'culori/fn' {
	export module Culori {
		export interface Hsl extends Color {
			mode: 'hsl';
			h: number;
			s: number;
			l: number;
			alpha?: number;
		}

		export interface Lab extends Color {
			mode: 'lab';
			l: number;
			a: number;
			b: number;
			alpha?: number;
		}

		export interface Lch extends Color {
			mode: 'lch';
			l: number;
			c: number;
			h: number;
			alpha?: number;
		}

		export interface Okhsl extends Color {
			mode: 'okhsl';
			h: number;
			s: number;
			l: number;
			alpha?: number;
		}

		export interface Oklab extends Color {
			mode: 'oklab';
			l: number;
			a: number;
			b: number;
			alpha?: number;
		}

		export interface Oklch extends Color {
			mode: 'oklch';
			l: number;
			c: number;
			h: number;
			alpha?: number;
		}

		export interface Rgb extends Color {
			mode: 'rgb';
			r: number;
			g: number;
			b: number;
			alpha?: number;
		}

		type Color = Hsl | Lab | Lch | Okhsl | Oklch | Rgb;

		type Definition = {
			mode: string;
			ranges: {
				[channel: string]: [number, number];
			};
		};
	}

	export function useMode<D extends Definition>(mode: D): void;

	export function parse(color: string): Culori.Color | null;
	export function parseHex(color: string): Culori.Rgb | null;

	export function formatHex(color: any): string;

	export function convertHslToRgb(
		color: Culori.Hsl
	): Culori.Rgb;

	export function convertLabToLch(
		color: Culori.Lab
	): Culori.Lch;

	export function convertLabToLch(
		color: Culori.Oklab,
		mode: 'oklch'
	): Culori.Oklch;

	export function convertLabToRgb(
		color: Culori.Lab
	): Culori.Rgb;

	export function convertLchToLab(
		color: Culori.Lch
	): Culori.Lab;

	export function convertLchToLab(
		color: Culori.Oklch,
		mode: 'oklab'
	): Culori.Oklab;

	export function convertOkhslToOklab(
		color: Culori.Okhsl
	): Culori.Oklab;

	export function convertOklabToOkhsl(
		color: Culori.Oklab
	): Culori.Okhsl;

	export function convertOklabToRgb(
		color: Culori.Oklab
	): Culori.Rgb;

	export function convertRgbToHsl(
		color: Culori.Rgb
	): Culori.Hsl;

	export function convertRgbToLab(
		color: Culori.Rgb
	): Culori.Lab;

	export function convertRgbToOklab(
		color: Culori.Rgb
	): Culori.Oklab;

	export function clampChroma<T extends Culori.Color>(
		color: T,
		mode?: string
	): T;

	export function wcagContrast<T extends Culori.Color>(
		background: T,
		foreground: T
	): number;

	export function filterDeficiencyProt<T extends Culori.Color>(
		severity?: number
	): (color: T) => T;

	export function filterDeficiencyDeuter<
		T extends Culori.Color
	>(severity?: number): (color: T) => T;

	export function filterDeficiencyTrit<T extends Culori.Color>(
		severity?: number
	): (color: T) => T;

	export const modeLch: Culori.Definition;
	export const modeLrgb: Culori.Definition;
}
