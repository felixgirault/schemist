import type {ContrastType} from '#lib/color/contrast.js';
import {Wcag2Level, equivalence} from '#lib/color/contrast.js';
import type {BlindnessType} from '#lib/core/contrast.js';
import {combine} from '#lib/core/contrast.js';
import type {Difference} from '#lib/core/difference.js';
import {difference} from '#lib/core/difference.js';
import type {PaletteColor} from '#lib/core/evaluate.js';
import type {PairTargets} from '#lib/core/nodes.js';
import type {TargetCheck} from '#lib/core/pairs.js';
import {checkPair, targetNames, uses} from '#lib/core/pairs.js';
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
	// the use that lights up and declares pairs in pairs mode
	use = $state<(typeof uses)[number]['id'] | 'custom'>('body');
	// the targets of the custom use, empty ones not checked
	custom = $state<PairTargets>({});
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

	// Picks a use; Custom starts from the targets of the last one.
	setUse(use: typeof this.use) {
		if (use === 'custom' && this.use !== 'custom') {
			this.custom = {...this.brushTargets};
		}

		this.use = use;
	}

	brushName = $derived(
		uses.find(({id}) => id === this.use)?.name ?? 'Custom'
	);

	// The targets a pair must meet together to reach the brush.
	brushTargets = $derived<PairTargets>(
		uses.find(({id}) => id === this.use)?.targets ??
			this.custom
	);

	// The brush's targets on a pair, as is and per selected simulation.
	brushChecks(fg: PaletteColor, bg: PaletteColor) {
		return checkPair(
			this.brushTargets,
			fg.rgbColor,
			bg.rgbColor,
			this.blindnessTypes
		);
	}

	// Whether a pair meets every target of the brush, worst case of
	// the selected simulations.
	passesBrush(fg: PaletteColor, bg: PaletteColor) {
		return this.brushChecks(fg, bg).every(({pass}) => pass);
	}

	// Whether a pair has every target of the brush at its value.
	hasBrush(pair?: PairTargets) {
		const checks = targetNames.filter(
			(name) => this.brushTargets[name] !== undefined
		);

		return (
			checks.length > 0 &&
			checks.every(
				(name) => pair?.[name] === this.brushTargets[name]
			)
		);
	}

	// Ordered pairs of compared colors, and those reaching the brush.
	cellCount = $derived(
		this.comparedColors.length *
			(this.comparedColors.length - 1)
	);
	passingCells = $derived(
		this.comparedColors.reduce(
			(n, bg) =>
				n +
				this.comparedColors.filter(
					(fg) =>
						fg.id !== bg.id && this.passesBrush(fg, bg)
				).length,
			0
		)
	);

	// Sets the brush's targets on a pair, or removes them if the pair
	// has them at those values already, so a target typed in the card
	// is never removed by a click.
	toggleBrush(fg: PaletteColor, bg: PaletteColor) {
		const brush = this.brushTargets;

		if (
			!targetNames.some((name) => brush[name] !== undefined)
		) {
			return;
		}

		const nodes = this.nodesOf(fg, bg);
		const pair = palette.pairs.find(
			(p) => p.fg === nodes.fg && p.bg === nodes.bg
		);
		const isSet = this.hasBrush(pair);
		const targets: PairTargets = {...pair};

		for (const name of targetNames) {
			if (brush[name] !== undefined) {
				targets[name] = isSet ? undefined : brush[name];
			}
		}

		palette.setPair(nodes.fg, nodes.bg, targets);
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
