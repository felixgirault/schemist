import type {
	ContrastGrade,
	ContrastType
} from '#lib/color/contrast.js';
import {
	wcag2Contrast,
	wcag2Grade,
	wcag3Contrast,
	wcag3Grade
} from '#lib/color/contrast.js';
import {
	simulateDeuteranomaly,
	simulateProtanomaly,
	simulateTritanomaly
} from '#lib/color/simulation.js';
import type {RgbColor} from '#lib/color/types.js';
import type {PaletteColor} from '#lib/core/evaluate.js';

export type BlindnessType =
	| 'protanomaly'
	| 'deuteranomaly'
	| 'tritanomaly';

const simulations: Record<
	BlindnessType,
	(color: RgbColor) => RgbColor
> = {
	protanomaly: simulateProtanomaly,
	deuteranomaly: simulateDeuteranomaly,
	tritanomaly: simulateTritanomaly
};

// Simulated once per color rather than once per pair it is in, as
// grids measure every color against all the others.
const simulated = new WeakMap<
	RgbColor,
	Partial<Record<BlindnessType, RgbColor>>
>();

export const simulation =
	(type: BlindnessType) => (color: RgbColor) => {
		let byType = simulated.get(color);

		if (!byType) {
			byType = {};
			simulated.set(color, byType);
		}

		return (byType[type] ??= simulations[type](color));
	};

const contrastFns: Record<
	ContrastType,
	{
		level: (bg: RgbColor, fg: RgbColor) => number;
		grade: (level: number) => ContrastGrade;
	}
> = {
	wcag2: {level: wcag2Contrast, grade: wcag2Grade},
	wcag3: {level: wcag3Contrast, grade: wcag3Grade}
};

export type CombinationContrast = {
	bg: RgbColor;
	fg: RgbColor;
	level: number;
	grade: ContrastGrade;
};

export type SimulatedContrast = CombinationContrast & {
	type: BlindnessType;
};

export type Combination = {
	uid: string;
	bgName: string;
	fgName: string;
	minLevel: number;
	minGrade: ContrastGrade;
	contrast: CombinationContrast;
	simulatedContrasts: SimulatedContrast[];
};

// Every entry of `bgEntries` as a background, against every other
// entry of `allEntries` as a foreground.
export const combine = (
	bgEntries: PaletteColor[],
	allEntries: PaletteColor[],
	contrastType: ContrastType,
	blindnessTypes: BlindnessType[]
): Combination[] => {
	const colorPairs = bgEntries.flatMap((color) =>
		allEntries
			.filter((other) => color.id !== other.id)
			.map((other): [PaletteColor, PaletteColor] => [
				color,
				other
			])
	);

	const {level: levelFn, grade: gradeFn} =
		contrastFns[contrastType];

	return colorPairs.map(([bgOutput, fgOutput]): Combination => {
		const baseLevel = levelFn(
			bgOutput.rgbColor,
			fgOutput.rgbColor
		);

		const baseGrade = gradeFn(baseLevel);

		let minLevel = baseLevel;
		let minGrade: ContrastGrade = baseGrade;

		const simulatedContrasts = blindnessTypes.map(
			(type): SimulatedContrast => {
				const simulate = simulation(type);

				const bg = simulate(bgOutput.rgbColor);
				const fg = simulate(fgOutput.rgbColor);
				const level = levelFn(bg, fg);
				const grade = gradeFn(level);

				if (level < minLevel) {
					minLevel = level;
					minGrade = grade;
				}

				return {
					type,
					bg,
					fg,
					level,
					grade
				};
			}
		);

		return {
			uid: `${bgOutput.id}-${fgOutput.id}`,
			bgName: bgOutput.name,
			fgName: fgOutput.name,
			minLevel,
			minGrade,
			contrast: {
				bg: bgOutput.rgbColor,
				fg: fgOutput.rgbColor,
				level: baseLevel,
				grade: baseGrade
			},
			simulatedContrasts
		};
	});
};
