import type {
	ContrastGrade,
	ContrastType
} from '#lib/color/contrast.js';
import {
	Wcag2Level,
	equivalence,
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
import type {Node} from '#lib/stores/nodes.svelte.js';
import type {PaletteColor} from '#lib/stores/palette.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {circular} from '#lib/utils/math.js';

export type BlindnessType =
	| 'protanomaly'
	| 'deuteranomaly'
	| 'tritanomaly';

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

const simulations: Record<
	BlindnessType,
	(color: RgbColor) => RgbColor
> = {
	protanomaly: simulateProtanomaly,
	deuteranomaly: simulateDeuteranomaly,
	tritanomaly: simulateTritanomaly
};

class Combinations {
	colorFilters = $state<Node['id'][]>([]);
	#contrastType = $state<ContrastType>('wcag2');
	minLevel = $state<number>(Wcag2Level.ko);
	blindnessTypes = $state<BlindnessType[]>([]);
	isLuminosityAnalysisEnabled = $state(false);
	previewedUid = $state<string | null>(null);

	get contrastType() {
		return this.#contrastType;
	}

	set contrastType(type) {
		this.#contrastType = type;
		this.minLevel = equivalence(type, this.minLevel);
	}

	// sorts colors by hue and lightness
	sortedColors = $derived.by(() => {
		const root = palette.root;
		const sorted = palette.colors
			.map((output): [number, PaletteColor] => {
				const {h, l} = output.color;
				const weight =
					Math.round(circular(h)) * 10 +
					(10 - Math.round(l) / 10);

				return [weight, output];
			})
			.sort(([a], [b]) => a - b)
			.map(([_, color]) => color);

		if (!root) {
			return sorted;
		}

		const pivot = sorted.findIndex(({id}) => id === root.id);
		return sorted.slice(pivot).concat(sorted.slice(0, pivot));
	});

	#filteredColors = $derived(
		this.colorFilters.length
			? this.sortedColors.filter(({id}) =>
					this.colorFilters.includes(id)
				)
			: this.sortedColors
	);

	#colorPairs = $derived(
		this.#filteredColors.flatMap((color) =>
			palette.colors
				.filter((other) => color.id !== other.id)
				.map((other): [PaletteColor, PaletteColor] => [
					color,
					other
				])
		)
	);

	all = $derived.by(() => {
		const {level: levelFn, grade: gradeFn} =
			contrastFns[this.contrastType];

		return this.#colorPairs.map(
			([bgOutput, fgOutput]): Combination => {
				const baseLevel = levelFn(
					bgOutput.rgbColor,
					fgOutput.rgbColor
				);

				const baseGrade = gradeFn(baseLevel);

				let minLevel = baseLevel;
				let minGrade: ContrastGrade = baseGrade;

				const simulatedContrasts = this.blindnessTypes.map(
					(type): SimulatedContrast => {
						const simulate = simulations[type];
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
			}
		);
	});

	filtered = $derived(
		this.all.filter(({minLevel}) => minLevel >= this.minLevel)
	);

	previewed = $derived(
		this.previewedUid
			? this.all.find(({uid}) => uid === this.previewedUid)
			: null
	);
}

export const combinations = new Combinations();
