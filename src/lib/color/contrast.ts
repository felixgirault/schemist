import {APCAcontrast, sRGBtoY} from 'apca-w3';
import {wcagContrast} from 'culori';
import type {Rgb} from 'culori/fn';
import {toRgb255} from '$lib/color/spaces';

export type ContrastType = 'wcag2' | 'wcag3';

export enum Wcag2Level {
	aaa = 7,
	aa = 4.5,
	aa18 = 3,
	ko = 0
}

export enum Wcag3Level {
	all = 75,
	body = 60,
	large = 45,
	text = 30,
	nonText = 15,
	ko = 0
}

const wcag2To3Equivalences = {
	[Wcag2Level.aaa]: Wcag3Level.all,
	[Wcag2Level.aa]: Wcag3Level.body,
	[Wcag2Level.aa18]: Wcag3Level.large,
	[Wcag2Level.ko]: Wcag3Level.ko
};

const wcag3To2Equivalences = {
	[Wcag3Level.all]: Wcag2Level.aaa,
	[Wcag3Level.body]: Wcag2Level.aa,
	[Wcag3Level.large]: Wcag2Level.aa18,
	[Wcag3Level.text]: Wcag2Level.aa18,
	[Wcag3Level.nonText]: Wcag2Level.ko,
	[Wcag3Level.ko]: Wcag2Level.ko
};

export const equivalence = (type, level) => {
	switch (type) {
		case 'wcag2':
			return wcag3To2Equivalences?.[level] ?? level;

		case 'wcag3':
			return wcag2To3Equivalences?.[level] ?? level;

		default:
			return level;
	}
};

export const wcag2Grade = (level: number) =>
	level >= Wcag2Level.aaa
		? 'AAA'
		: level >= Wcag2Level.aa
		? 'AA'
		: level >= Wcag2Level.aa18
		? 'AA18'
		: 'KO';

export const wcag3Grade = (level: number) =>
	level >= Wcag3Level.all
		? '5'
		: level >= Wcag3Level.body
		? '4'
		: level >= Wcag3Level.large
		? '3'
		: level >= Wcag3Level.text
		? '2'
		: level >= Wcag3Level.nonText
		? '1'
		: '0';

export const wcag2Contrast = (bg: Rgb, fg: Rgb) =>
	wcagContrast(bg, fg);

export const wcag3Contrast = (bg: Rgb, fg: Rgb) => {
	const {r: bgR, g: bgG, b: bgB} = toRgb255(bg);
	const {r: fgR, g: fgG, b: fgB} = toRgb255(fg);

	return Math.abs(
		APCAcontrast(
			sRGBtoY([fgR, fgG, fgB]),
			sRGBtoY([bgR, bgG, bgB])
		) as number
	);
};
