import {
	type Rgb,
	clampRgb,
	convertLrgbToRgb,
	convertRgbToLrgb
} from 'culori/fn';
import {rgbFromCulori, rgbToCulori} from './culori';
import type {RgbColor} from './types';

type Matrix = [
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number
];

// Color vision deficiency simulation, at full severity, from:
// G. M. Machado, M. M. Oliveira and L. A. F. Fernandes, "A
// Physiologically-based Model for Simulation of Color Vision
// Deficiency", IEEE TVCG, vol. 15, no. 6, 2009.
// @see https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html
//
// Matrices apply to linear RGB, so culori's filters, which apply
// them to gamma-encoded values, are not used.
const protanomaly: Matrix = [
	0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216,
	-0.003882, -0.048116, 1.051998
];

const deuteranomaly: Matrix = [
	0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413,
	-0.01182, 0.04294, 0.968881
];

const tritanomaly: Matrix = [
	1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602,
	0.004733, 0.691367, 0.3039
];

// Filters can yield colors out of the sRGB gamut, which
// can't be displayed and break APCA calculations (see #46).
const simulate = (m: Matrix) => (color: RgbColor) => {
	const {r, g, b, alpha} = convertRgbToLrgb(rgbToCulori(color));
	const simulated = convertLrgbToRgb({
		r: m[0] * r + m[1] * g + m[2] * b,
		g: m[3] * r + m[4] * g + m[5] * b,
		b: m[6] * r + m[7] * g + m[8] * b,
		alpha
	});

	return rgbFromCulori(clampRgb(simulated) as Rgb);
};

export const simulateProtanomaly = simulate(protanomaly);
export const simulateDeuteranomaly = simulate(deuteranomaly);
export const simulateTritanomaly = simulate(tritanomaly);

export type BlindnessType =
	| 'protanomaly'
	| 'deuteranomaly'
	| 'tritanomaly';

export const simulations: Record<
	BlindnessType,
	(color: RgbColor) => RgbColor
> = {
	protanomaly: simulateProtanomaly,
	deuteranomaly: simulateDeuteranomaly,
	tritanomaly: simulateTritanomaly
};
