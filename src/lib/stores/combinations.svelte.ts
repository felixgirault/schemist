import type {BlindnessType} from '#lib/core/contrast.js';
import type {PaletteColor} from '#lib/core/evaluate.js';
import type {AppRule} from '#lib/core/nodes.js';
import type {ExpandedPair} from '#lib/core/pairs.js';
import type {TargetCheck, Use} from '#lib/core/pairs.js';
import {checkPair, uses, usesOf} from '#lib/core/pairs.js';
import {palette} from '#lib/stores/palette.svelte.js';

// A declared pair checked against its targets, `id` being
// `<bgId>-<fgId>`.
export type PairCheck = {
	id: string;
	pair: ExpandedPair<string, string>;
	fg: PaletteColor;
	bg: PaletteColor;
	checks: TargetCheck[];
	pass: boolean;
	// what the pair is for, inferred from its targets
	for: ReturnType<typeof usesOf>;
};

class Combinations {
	blindnessTypes = $state<BlindnessType[]>([]);
	isLuminosityAnalysisEnabled = $state(false);
	previewedUid = $state<string | null>(null);

	// declared pairs of visible colors, checked as they are measured
	pairChecks = $derived.by(() => {
		const byId = new Map(palette.colors.map((e) => [e.id, e]));

		return palette.expandedPairs.flatMap(
			(pair): PairCheck[] => {
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
			}
		);
	});

	passingPairs = $derived(
		this.pairChecks.filter(({pass}) => pass).length
	);

	// declared pairs left out of the checks, by color names
	hiddenPairs = $derived.by(() => {
		const byId = new Map(
			palette.allColors.map((c) => [c.id, c])
		);

		return palette.expandedPairs.flatMap(({fg, bg}) => {
			const from = byId.get(fg);
			const to = byId.get(bg);

			return from?.isHidden || to?.isHidden
				? [{id: `${bg}-${fg}`, fg: from!.name, bg: to!.name}]
				: [];
		});
	});

	oneOffChecks = $derived(
		this.pairChecks.filter(({pair}) => pair.sources.oneOff)
	);

	// The pairs of each rule, by rule id, that are checked.
	ruleChecks = $derived.by(() => {
		const checks = new Map<string, PairCheck[]>(
			palette.rules.map(({id}) => [id, []])
		);

		for (const check of this.pairChecks) {
			for (const id of check.pair.sources.rules) {
				checks.get(id)?.push(check);
			}
		}

		return checks;
	});

	// The names of a rule: "Muted on Surfaces", and its use's.
	describeRule(rule: AppRule) {
		const name = (id?: string) =>
			palette.roles.find((role) => role.id === id)?.name ??
			'?';

		return {
			label:
				rule.bg === undefined
					? `${name(rule.fg)} among themselves`
					: `${name(rule.fg)} on ${name(rule.bg)}`,
			use:
				uses.find(({id}) => id === rule.use)?.name ??
				'Custom'
		};
	}

	// The one-off pairs by use, Custom last; a pair is under each use
	// it holds. Empty uses are left out.
	requirements = $derived(
		[
			...uses.map((use) => ({
				id: use.id,
				name: use.name,
				checks: this.oneOffChecks.filter(({for: f}) =>
					f.uses.includes(use)
				)
			})),
			{
				id: 'custom',
				name: 'Custom',
				checks: this.oneOffChecks.filter(
					({for: f}) => f.custom
				)
			}
		].filter(({checks}) => checks.length)
	);

	// Declares a pair for a use, keeping its other targets; false for
	// one color on itself.
	addPair(fg: string, bg: string, use: Use) {
		if (fg === bg) return false;

		const pair = palette.pairs.find(
			(p) => p.fg === fg && p.bg === bg
		);

		palette.setPair(fg, bg, {...pair, ...use.targets});
		return true;
	}

	// The pair of the preview, declared or not.
	previewed = $derived.by(() => {
		const uid = this.previewedUid;

		if (!uid) return null;

		for (const bg of palette.colors) {
			for (const fg of palette.colors) {
				if (`${bg.id}-${fg.id}` === uid) {
					return {
						bgName: bg.name,
						fgName: fg.name,
						contrast: {bg: bg.rgbColor, fg: fg.rgbColor}
					};
				}
			}
		}

		return null;
	});
}

export const combinations = new Combinations();
