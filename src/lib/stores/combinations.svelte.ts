import type {ContrastType} from '#lib/color/contrast.js';
import {Wcag2Level, equivalence} from '#lib/color/contrast.js';
import type {BlindnessType} from '#lib/core/contrast.js';
import {combine} from '#lib/core/contrast.js';
import type {Difference} from '#lib/core/difference.js';
import {difference} from '#lib/core/difference.js';
import type {PaletteColor} from '#lib/core/evaluate.js';
import type {Node} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {circular} from '#lib/utils/math.js';

export type PairDifference = Difference & {
	id: string;
	a: PaletteColor;
	b: PaletteColor;
};

class Combinations {
	mode = $state<'contrast' | 'difference'>('contrast');
	minDifference = $state(10);
	openDifferenceId = $state<string | null>(null);
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

	comparedColors = $derived(
		this.colorFilters.length
			? this.sortedColors.filter(({id}) =>
					this.colorFilters.includes(id)
				)
			: this.sortedColors
	);

	all = $derived(
		combine(
			this.comparedColors,
			palette.colors,
			this.contrastType,
			this.blindnessTypes
		)
	);

	filtered = $derived(
		this.all.filter(({minLevel}) => minLevel >= this.minLevel)
	);

	// one per unordered pair of the compared colors
	differences = $derived(
		this.comparedColors.flatMap((a, i) =>
			this.comparedColors
				.slice(i + 1)
				.map((b): PairDifference => ({
					id: `${a.id}-${b.id}`,
					a,
					b,
					...difference(
						a.rgbColor,
						b.rgbColor,
						this.blindnessTypes
					)
				}))
		)
	);

	openDifference = $derived(
		this.differences.find(
			({id}) => id === this.openDifferenceId
		) ?? null
	);

	previewed = $derived(
		this.previewedUid
			? this.all.find(({uid}) => uid === this.previewedUid)
			: null
	);
}

export const combinations = new Combinations();
