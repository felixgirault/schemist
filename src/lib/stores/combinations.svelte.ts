import type {ContrastType} from '#lib/color/contrast.js';
import {Wcag2Level, equivalence} from '#lib/color/contrast.js';
import type {BlindnessType} from '#lib/core/contrast.js';
import {combine} from '#lib/core/contrast.js';
import type {Difference} from '#lib/core/difference.js';
import {difference} from '#lib/core/difference.js';
import type {PaletteColor} from '#lib/core/evaluate.js';
import type {PairTargets} from '#lib/core/nodes.js';
import type {TargetCheck, Use} from '#lib/core/pairs.js';
import {
	checkPair,
	holdsUse,
	targetNames,
	usesOf,
	uses
} from '#lib/core/pairs.js';
import type {ColorPair, Node} from '#lib/stores/nodes.svelte.js';
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
	pair: ColorPair;
	fg: PaletteColor;
	bg: PaletteColor;
	checks: TargetCheck[];
	pass: boolean;
	// what the pair is for, inferred from its targets
	for: ReturnType<typeof usesOf>;
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
			const fg = byId.get(pair.fg);
			const bg = byId.get(pair.bg);

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
					pass: checks.every(({pass}) => pass),
					for: usesOf(pair)
				}
			];
		});
	});

	passingPairs = $derived(
		this.pairChecks.filter(({pass}) => pass).length
	);

	// declared pairs left out of the checks, by color names
	hiddenPairs = $derived.by(() => {
		const byId = new Map(
			palette.allColors.map((c) => [c.id, c])
		);

		return palette.pairs.flatMap(({fg, bg}) => {
			const from = byId.get(fg);
			const to = byId.get(bg);

			return from?.isHidden || to?.isHidden
				? [{id: `${bg}-${fg}`, fg: from!.name, bg: to!.name}]
				: [];
		});
	});

	// The declared pairs by use, Custom last; a pair is under each use
	// it holds. Empty uses are left out.
	requirements = $derived(
		[
			...uses.map((use) => ({
				id: use.id,
				name: use.name,
				checks: this.pairChecks.filter(({for: f}) =>
					f.uses.includes(use)
				)
			})),
			{
				id: 'custom',
				name: 'Custom',
				checks: this.pairChecks.filter(
					({for: f}) => f.custom
				)
			}
		].filter(({checks}) => checks.length)
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
			check: this.pairChecks.find(
				({id}) => id === `${bg.id}-${fg.id}`
			)
		};
	});

	// Picks a use; Custom starts from the targets of the last one.
	setUse(use: typeof this.use) {
		if (use === 'custom' && this.use !== 'custom') {
			this.custom = {...this.useTargets};
		}

		this.use = use;
	}

	useName = $derived(
		uses.find(({id}) => id === this.use)?.name ?? 'Custom'
	);

	// The targets a pair must meet together to meet the use.
	useTargets = $derived<PairTargets>(
		uses.find(({id}) => id === this.use)?.targets ??
			this.custom
	);

	// The use's checks of every cell, once per change rather than
	// once per reader (the cell, its card and the count).
	#cellChecks = $derived.by(() => {
		const checks = new Map<string, TargetCheck[]>();

		for (const bg of this.comparedColors) {
			for (const fg of this.comparedColors) {
				if (fg.id !== bg.id) {
					checks.set(
						`${bg.id}-${fg.id}`,
						checkPair(
							this.useTargets,
							fg.rgbColor,
							bg.rgbColor,
							this.blindnessTypes
						)
					);
				}
			}
		}

		return checks;
	});

	// The use's targets on a pair, as is and per selected simulation.
	checkUse(fg: PaletteColor, bg: PaletteColor) {
		return (
			this.#cellChecks.get(`${bg.id}-${fg.id}`) ??
			checkPair(
				this.useTargets,
				fg.rgbColor,
				bg.rgbColor,
				this.blindnessTypes
			)
		);
	}

	// Whether a pair meets every target of the use, worst case of
	// the selected simulations.
	passesUse(fg: PaletteColor, bg: PaletteColor) {
		return this.checkUse(fg, bg).every(({pass}) => pass);
	}

	// Ordered pairs of compared colors, and those meeting the use.
	cellCount = $derived(
		this.comparedColors.length *
			(this.comparedColors.length - 1)
	);
	passingCells = $derived(
		this.comparedColors.reduce(
			(n, bg) =>
				n +
				this.comparedColors.filter(
					(fg) => fg.id !== bg.id && this.passesUse(fg, bg)
				).length,
			0
		)
	);

	// Sets a use's targets on a pair, or removes them if the pair
	// has them at those values already, so a target typed in the card
	// is never removed by a click.
	toggleUse(fg: PaletteColor, bg: PaletteColor, use: Use) {
		const pair = palette.pairs.find(
			(p) => p.fg === fg.id && p.bg === bg.id
		);
		const isSet = holdsUse(pair, use);
		const targets: PairTargets = {...pair};

		for (const name of targetNames) {
			const wanted =
				use.targets[name as keyof Use['targets']];

			if (wanted !== undefined) {
				targets[name] = isSet ? undefined : wanted;
			}
		}

		palette.setPair(fg.id, bg.id, targets);
	}

	previewed = $derived(
		this.previewedUid
			? this.all.find(({uid}) => uid === this.previewedUid)
			: null
	);
}

export const combinations = new Combinations();
