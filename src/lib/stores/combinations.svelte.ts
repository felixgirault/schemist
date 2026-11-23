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

	// Declared pairs of the given colors, checked as they are measured.
	#check(colors: PaletteColor[]) {
		const byId = new Map(colors.map((e) => [e.id, e]));

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
	}

	// The pairs in the selected variant: the ones the cards show.
	pairChecks = $derived(this.#check(palette.colors));

	// The pairs of every variant, by name, the selected one being
	// `pairChecks`; one unnamed entry without variants (ADR 19).
	allChecks = $derived(
		palette.variants.length
			? palette.variantColors.map(({id, name, colors}) => ({
					name,
					checks:
						id === palette.selectedVariant?.id
							? this.pairChecks
							: this.#check(colors)
				}))
			: [{name: '', checks: this.pairChecks}]
	);

	// Pairs checked and passing, each counted once per variant.
	checkedPairs = $derived(
		this.allChecks.reduce(
			(n, {checks}) => n + checks.length,
			0
		)
	);

	passingPairs = $derived(
		this.allChecks.reduce(
			(n, {checks}) =>
				n + checks.filter((c) => c.pass).length,
			0
		)
	);

	// The variants where each rule's pairs are not met ('' without
	// variants), walked once per change rather than for each rule.
	#failing = $derived.by(() => {
		const rules = new Map<string, string[]>();

		for (const {name, checks} of this.allChecks) {
			for (const {pair, pass} of checks) {
				if (pass) continue;

				for (const rule of pair.sources.rules) {
					const names = rules.get(rule) ?? [];

					if (!names.includes(name)) {
						rules.set(rule, [...names, name]);
					}
				}
			}
		}

		return rules;
	});

	// Whether a rule is met in every variant, and its text: "met",
	// "not met", or "not met in Dark" naming the variants.
	ruleStatus(id: string) {
		const failing = this.#failing.get(id) ?? [];
		const names = failing.filter(Boolean);

		return {
			pass: !failing.length,
			text: !failing.length
				? 'met'
				: names.length
					? `not met in ${names.join(', ')}`
					: 'not met'
		};
	}

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
