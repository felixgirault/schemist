import type {BlindnessType} from '#lib/core/contrast.js';
import type {PaletteColor} from '#lib/core/evaluate.js';
import type {AppRule, PairTargets} from '#lib/core/nodes.js';
import type {ExpandedPair} from '#lib/core/pairs.js';
import type {TargetCheck, Use} from '#lib/core/pairs.js';
import {
	checkPair,
	holdsUse,
	targetNames,
	usesOf,
	uses
} from '#lib/core/pairs.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {circular} from '#lib/utils/math.js';

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

// The colors of a role of the grid, or of those with none (Other).
export type PairGroup = {
	id: string;
	name: string;
	isOther: boolean;
	colors: PaletteColor[];
};

class Combinations {
	openPairIds = $state<{fg: string; bg: string} | null>(null);
	blindnessTypes = $state<BlindnessType[]>([]);
	isLuminosityAnalysisEnabled = $state(false);
	previewedUid = $state<string | null>(null);

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

	// The grid cells (`<bgId>-<fgId>`) of each rule: its pairs, and
	// their reverse for a role among itself, which has no order.
	ruleCells = $derived(
		new Map(
			palette.rules.map((rule) => {
				const among = rule.bg === undefined;
				const cells = new Set<string>();

				for (const {fg, bg} of this.ruleChecks.get(
					rule.id
				) ?? []) {
					cells.add(`${bg.id}-${fg.id}`);
					if (among) cells.add(`${fg.id}-${bg.id}`);
				}

				return [rule.id, cells];
			})
		)
	);

	// The rule being hovered or focused in the requirements, whose
	// cells the grid outlines (not to be mistaken for the dimming).
	ruleId = $state<string | null>(null);
	outlinedCells = $derived(
		this.ruleId ? this.ruleCells.get(this.ruleId) : undefined
	);

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

	// The compared colors by role, as a reading aid: a color is under
	// its first role, those with none last, the order kept otherwise.
	// `rolesOf` has every role of a color, for its tooltip.
	rolesOf = $derived.by(() => {
		const roles = new Map<string, string[]>();

		for (const {name, colors} of palette.roles) {
			for (const id of colors) {
				roles.set(id, [...(roles.get(id) ?? []), name]);
			}
		}

		return roles;
	});

	// The grid's colors by role: a color is under its first role (the
	// sorted order kept), those with none in Other, last. Roles with no
	// visible color are left out.
	groups = $derived.by(() => {
		const groups = palette.roles.map(({id, name}) => ({
			id,
			name,
			isOther: false,
			colors: [] as PaletteColor[]
		}));
		const other = {
			id: 'other',
			name: 'Other',
			isOther: true,
			colors: [] as PaletteColor[]
		};
		const byColor = new Map<string, PairGroup>();

		for (const group of groups) {
			for (const id of palette.roles.find(
				(role) => role.id === group.id
			)!.colors) {
				if (!byColor.has(id)) byColor.set(id, group);
			}
		}

		for (const color of this.sortedColors) {
			(byColor.get(color.id) ?? other).colors.push(color);
		}

		return [...groups, other].filter(
			({colors}) => colors.length
		);
	});

	pairColors = $derived(this.groups.flatMap(({colors}) => colors));

	// The groups the user flipped from their default: Other starts
	// collapsed once a role exists. Not saved.
	flippedGroups = $state<string[]>([]);

	isCollapsed(group: PairGroup) {
		return (
			(group.isOther && palette.roles.length > 0) !==
			this.flippedGroups.includes(group.id)
		);
	}

	toggleGroup(id: string) {
		this.flippedGroups = this.flippedGroups.includes(id)
			? this.flippedGroups.filter((flipped) => flipped !== id)
			: [...this.flippedGroups, id];
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

	// The cell shown in the details: its colors, and its pair if it
	// is declared. `null` once a color is gone.
	openPair = $derived.by(() => {
		const ids = this.openPairIds;
		const fg = this.sortedColors.find(
			({id}) => id === ids?.fg
		);
		const bg = this.sortedColors.find(
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

	// The pair of the preview, declared or not: a cell of the grid.
	previewed = $derived.by(() => {
		const uid = this.previewedUid;

		if (!uid) return null;

		for (const bg of this.sortedColors) {
			for (const fg of this.sortedColors) {
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
