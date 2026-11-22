import type {ContrastType} from '#lib/color/contrast.js';
import {Wcag2Level, equivalence} from '#lib/color/contrast.js';
import type {BlindnessType} from '#lib/core/contrast.js';
import {combine} from '#lib/core/contrast.js';
import type {Difference} from '#lib/core/difference.js';
import {difference} from '#lib/core/difference.js';
import type {PaletteColor} from '#lib/core/evaluate.js';
import type {TargetCheck} from '#lib/core/pairs.js';
import {checkPair} from '#lib/core/pairs.js';
import type {Node, NodePair} from '#lib/stores/nodes.svelte.js';
import {collectNodes} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {circular} from '#lib/utils/math.js';

export type PairDifference = Difference & {
	id: string;
	a: PaletteColor;
	b: PaletteColor;
};

// A declared pair checked against its targets, `id` being
// `<bgId>-<fgId>`.
export type PairCheck = {
	id: string;
	pair: NodePair;
	fg: PaletteColor;
	bg: PaletteColor;
	checks: TargetCheck[];
	pass: boolean;
};

class Combinations {
	mode = $state<'contrast' | 'difference' | 'pairs'>(
		'contrast'
	);
	openPairIds = $state<{fg: string; bg: string} | null>(null);
	// the filter that lights up and declares pairs in pairs mode
	brush = $state<'contrast' | 'difference'>('contrast');
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

	// declared pairs of visible colors, checked as they are measured
	pairChecks = $derived.by(() => {
		const byId = new Map(palette.colors.map((e) => [e.id, e]));

		return palette.pairs.flatMap((pair): PairCheck[] => {
			const fg = byId.get(pair.fg.id);
			const bg = byId.get(pair.bg.id);

			if (!fg || !bg) return [];

			const checks = checkPair(
				pair,
				fg.rgbColor,
				bg.rgbColor,
				this.blindnessTypes
			);

			return [
				{
					id: `${bg.id}-${fg.id}`,
					pair,
					fg,
					bg,
					checks,
					pass: checks.every(({pass}) => pass)
				}
			];
		});
	});

	passingPairs = $derived(
		this.pairChecks.filter(({pass}) => pass).length
	);

	// declared pairs left out of the checks
	hiddenPairs = $derived(
		palette.pairs.filter(
			({fg, bg}) => fg.isHidden || bg.isHidden
		)
	);

	// The cell shown in the details: its colors, and its pair if it
	// is declared. `null` once a color is gone.
	openPair = $derived.by(() => {
		const ids = this.openPairIds;
		const fg = this.comparedColors.find(
			({id}) => id === ids?.fg
		);
		const bg = this.comparedColors.find(
			({id}) => id === ids?.bg
		);

		if (!fg || !bg) return null;

		return {
			fg,
			bg,
			nodes: this.nodesOf(fg, bg),
			check: this.pairChecks.find(
				({id}) => id === `${bg.id}-${fg.id}`
			)
		};
	});

	// The brush's target, or null when its minimum is 0 and there is
	// nothing to declare.
	brushTarget = $derived.by(() => {
		const [name, value] =
			this.brush === 'difference'
				? (['difference', this.minDifference] as const)
				: this.contrastType === 'wcag2'
					? (['wcag2', this.minLevel] as const)
					: (['apca', this.minLevel] as const);

		return value > 0 ? {name, value} : null;
	});

	// Whether a pair reaches the brush's minimum, worst case of the
	// selected simulations.
	passesBrush(fg: PaletteColor, bg: PaletteColor) {
		const target = this.brushTarget;

		return target
			? checkPair(
					{[target.name]: target.value},
					fg.rgbColor,
					bg.rgbColor,
					this.blindnessTypes
				)[0].pass
			: true;
	}

	// Sets the brush's target on a pair, or removes it if the pair
	// has it at that value already, so a target typed in the card is
	// never removed by a click.
	toggleBrush(fg: PaletteColor, bg: PaletteColor) {
		const target = this.brushTarget;

		if (!target) return;

		const nodes = this.nodesOf(fg, bg);
		const pair = palette.pairs.find(
			(p) => p.fg === nodes.fg && p.bg === nodes.bg
		);
		const {wcag2, apca, difference} = pair ?? {};

		palette.setPair(nodes.fg, nodes.bg, {
			wcag2,
			apca,
			difference,
			[target.name]:
				pair?.[target.name] === target.value
					? undefined
					: target.value
		});
	}

	nodesOf(fg: PaletteColor, bg: PaletteColor) {
		const nodes = palette.root
			? collectNodes(palette.root)
			: [];

		return {
			fg: nodes.find(({id}) => id === fg.id)!,
			bg: nodes.find(({id}) => id === bg.id)!
		};
	}

	previewed = $derived(
		this.previewedUid
			? this.all.find(({uid}) => uid === this.previewedUid)
			: null
	);
}

export const combinations = new Combinations();
