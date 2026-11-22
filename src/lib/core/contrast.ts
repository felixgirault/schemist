import type {ContrastType} from '#lib/color/contrast.js';
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
import type {Entry} from '#lib/core/evaluate.js';

export type BlindnessType =
	| 'none'
	| 'protanomaly'
	| 'deuteranomaly'
	| 'tritanomaly';

export const simulation = (type: BlindnessType) =>
	type === 'protanomaly'
		? simulateProtanomaly
		: type === 'deuteranomaly'
			? simulateDeuteranomaly
			: simulateTritanomaly;

export type CombinationContrast = {
	type: BlindnessType;
	bg: RgbColor;
	fg: RgbColor;
	level: number;
	grade: string;
};

export type Combination = {
	uid: string;
	bgName: string;
	fgName: string;
	minLevel: number;
	minGrade: string;
	contrast: CombinationContrast;
	simulatedContrasts: CombinationContrast[];
};

// Every entry of `bgEntries` as a background, against every other
// entry of `allEntries` as a foreground.
export const combine = (
	bgEntries: Entry[],
	allEntries: Entry[],
	contrastType: ContrastType,
	blindnessTypes: BlindnessType[]
): Combination[] => {
	const colorPairs = bgEntries.flatMap((color) =>
		allEntries
			.filter((other) => color.id !== other.id)
			.map((other): [Entry, Entry] => [color, other])
	);

	const levelFn =
		contrastType === 'wcag2' ? wcag2Contrast : wcag3Contrast;
	const gradeFn =
		contrastType === 'wcag2' ? wcag2Grade : wcag3Grade;

	return colorPairs.map(([bgOutput, fgOutput]): Combination => {
		const baseLevel = levelFn(
			bgOutput.rgbColor,
			fgOutput.rgbColor
		);

		const baseGrade = gradeFn(baseLevel);

		let minLevel = baseLevel;
		let minGrade = baseGrade;

		const simulatedContrasts = blindnessTypes.map((type) => {
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
		});

		return {
			uid: `${bgOutput.id}-${fgOutput.id}`,
			bgName: bgOutput.name,
			fgName: fgOutput.name,
			minLevel,
			minGrade,
			contrast: {
				type: 'none',
				bg: bgOutput.rgbColor,
				fg: fgOutput.rgbColor,
				level: baseLevel,
				grade: baseGrade
			},
			simulatedContrasts
		};
	});
};
