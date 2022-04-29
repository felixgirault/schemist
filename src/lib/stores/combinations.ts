import type {Rgb} from 'culori/fn';
import type {Readable} from 'svelte/store';
import {derived, get, writable} from 'svelte/store';
import type {ContrastType} from '$lib/color/contrast';
import {
	Wcag2Level,
	Wcag3Level,
	equivalence,
	wcag2Contrast,
	wcag2Grade,
	wcag3Contrast,
	wcag3Grade
} from '$lib/color/contrast';
import {
	simulateDeuteranomaly,
	simulateProtanomaly,
	simulateTritanomaly
} from '$lib/color/simulation';
import {rgbColor} from '$lib/color/spaces';
import type {Node, NodeOutput} from '$lib/stores/nodes';
import {debouncedOutputs, rootNode} from '$lib/stores/palette';
import {circular} from '$lib/utils/math';

export type BlindnessType =
	| 'none'
	| 'protanomaly'
	| 'deuteranomaly'
	| 'tritanomaly';

export type Entry = {
	id: Node['id'];
	name: NodeOutput[1];
	color: NodeOutput[0];
	rgbColor: Rgb;
};

export type CombinationContrast = {
	type: BlindnessType;
	bg: Rgb;
	fg: Rgb;
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

export const colorFilters = writable<Node['id'][]>([]);
export const contrastType = writable<ContrastType>('wcag2');
export const minLevel = writable<number>(
	get(contrastType) === 'wcag2'
		? Wcag2Level.aa18
		: Wcag3Level.large
);

contrastType.subscribe((type) => {
	minLevel.update((level) => equivalence(type, level));
});

export const blindnessTypes = writable<BlindnessType[]>([]);
export const isLuminosityAnalysisEnabled = writable(false);

export const colorEntries = derived(
	debouncedOutputs,
	($outputs) =>
		Object.entries($outputs).map(
			([id, output]): Entry => ({
				id,
				color: output[0],
				rgbColor: rgbColor(output[0]),
				name: output[1]
			})
		)
);

// sorts colors by hue and lightness
export const sortedColors: Readable<Entry[]> = derived(
	colorEntries,
	($colors) => {
		const $root = get(rootNode);
		const sorted = $colors
			.map((output): [number, Entry] => {
				const {h, l} = output.color;
				const weight =
					Math.round(circular(h)) * 10 +
					(10 - Math.round(l) / 10);

				return [weight, output];
			})
			.sort(([a], [b]) => a - b)
			.map(([_, color]) => color);

		if (!$root) {
			return sorted;
		}

		const pivot = sorted.findIndex(({id}) => id === $root.id);
		return sorted.slice(pivot).concat(sorted.slice(0, pivot));
	},
	[]
);

const filteredColors = derived(
	[sortedColors, colorFilters],
	([$colors, $filters]) =>
		$filters.length
			? $colors.filter(({id}) => $filters.includes(id))
			: $colors
);

const colorPairs = derived(filteredColors, ($colors) => {
	const $all = get(colorEntries);
	return $colors.flatMap((color) =>
		$all
			.filter((other) => color.id !== other.id)
			.map((other) => [color, other])
	);
});

export const combinations = derived(
	[colorPairs, contrastType, blindnessTypes],
	([$pairs, $type, $blindnessTypes]) => {
		// Not in derived dependencies so it doesn't trigger
		// a computation (only sortedColorIds should).
		const levelFn =
			$type === 'wcag2' ? wcag2Contrast : wcag3Contrast;
		const gradeFn =
			$type === 'wcag2' ? wcag2Grade : wcag3Grade;

		return $pairs.map(([bgOutput, fgOutput]): Combination => {
			const baseLevel = levelFn(
				bgOutput.rgbColor,
				fgOutput.rgbColor
			);

			const baseGrade = gradeFn(baseLevel);

			let minLevel = baseLevel;
			let minGrade = baseGrade;

			const simulatedContrasts = $blindnessTypes.map(
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
		});
	},
	[]
);

export const filteredCombinations = derived(
	[combinations, minLevel],
	([$combinations, $level]) =>
		$combinations.filter(({minLevel}) => minLevel >= $level)
);

export const previewedCombinationUid = writable<string>();

export const previewedCombination = derived(
	[previewedCombinationUid, combinations],
	([$uid, $combinations]) => {
		if (!$uid) {
			return null;
		}

		return $combinations.find(({uid}) => uid === $uid);
	}
);
