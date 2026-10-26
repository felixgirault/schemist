import type {ContrastType} from '#lib/color/contrast.js';
import {
	Wcag2Level,
	Wcag3Level,
	equivalence,
	wcag2Contrast,
	wcag2Grade,
	wcag3Contrast,
	wcag3Grade
} from '#lib/color/contrast.js';
import {schemistToRgb} from '#lib/color/conversion.js';
import {
	simulateDeuteranomaly,
	simulateProtanomaly,
	simulateTritanomaly
} from '#lib/color/simulation.js';
import type {RgbColor} from '#lib/color/types.js';
import type {
	Node,
	NodeOutput
} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {circular} from '#lib/utils/math.js';

export type BlindnessType =
	| 'none'
	| 'protanomaly'
	| 'deuteranomaly'
	| 'tritanomaly';

export type Entry = {
	id: Node['id'];
	name: NodeOutput[1];
	color: NodeOutput[0];
	rgbColor: RgbColor;
};

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

	colorEntries = $derived(
		Object.entries(palette.debouncedOutputs).map(
			([id, output]): Entry => ({
				id,
				color: output[0],
				rgbColor: schemistToRgb(output[0]),
				name: output[1]
			})
		)
	);

	// sorts colors by hue and lightness
	sortedColors = $derived.by(() => {
		const root = palette.root;
		const sorted = this.colorEntries
			.map((output): [number, Entry] => {
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

	// background id => foreground id => selected
	selected = $state<
		Record<Node['id'], Record<Node['id'], boolean>>
	>({});

	#selectedPairs = $derived(
		Object.entries(this.selected).flatMap(([bgId, fgs]) => {
			const bg = this.#filteredColors.find(
				({id}) => id === bgId
			);
			return Object.entries(fgs).flatMap(
				([fgId, isSelected]) => {
					const fg = this.colorEntries.find(
						({id}) => id === fgId
					);
					return bg && fg && isSelected
						? [[bg, fg] as [Entry, Entry]]
						: [];
				}
			);
		})
	);

	all = $derived.by(() => {
		const levelFn =
			this.contrastType === 'wcag2'
				? wcag2Contrast
				: wcag3Contrast;
		const gradeFn =
			this.contrastType === 'wcag2' ? wcag2Grade : wcag3Grade;

		return this.#selectedPairs.map(
			([bgOutput, fgOutput]): Combination => {
				const baseLevel = levelFn(
					bgOutput.rgbColor,
					fgOutput.rgbColor
				);

				const baseGrade = gradeFn(baseLevel);

				let minLevel = baseLevel;
				let minGrade = baseGrade;

				const simulatedContrasts = this.blindnessTypes.map(
					(type) => {
						const simulate =
							type === 'protanomaly'
								? simulateProtanomaly
								: type === 'deuteranomaly'
									? simulateDeuteranomaly
									: simulateTritanomaly;

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
						type: 'none',
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
