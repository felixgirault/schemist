import {
	wcag2Contrast,
	wcag3Contrast
} from '#lib/color/contrast.js';
import type {RgbColor} from '#lib/color/types.js';
import type {BlindnessType} from '#lib/core/contrast.js';
import {simulation} from '#lib/core/contrast.js';
import {difference} from '#lib/core/difference.js';
import type {
	PairTargets,
	PresetPair,
	Role,
	Rule
} from '#lib/core/nodes.js';

export type PairError = {
	index: number;
	// the pair's field the message is about, if any
	field?: 'fg' | 'bg';
	message: string;
};

export type ResolvedPair<T> = PairTargets & {fg: T; bg: T};

export const targetNames = [
	'wcag2',
	'apca',
	'difference'
] as const;

// What a pair is checked for, as the targets it takes together.
export const uses = [
	{
		id: 'body',
		name: 'Body text',
		targets: {wcag2: 4.5, apca: 75}
	},
	{
		id: 'large',
		name: 'Large text and UI',
		targets: {wcag2: 3}
	},
	{
		id: 'categories',
		name: 'Categories',
		targets: {difference: 10}
	}
] as const satisfies {
	id: string;
	name: string;
	targets: PairTargets;
}[];

export type Use = (typeof uses)[number];

// Whether a pair has every target of the use at its value.
export const holdsUse = (
	pair: PairTargets | undefined,
	use: Use
) =>
	targetNames.every(
		(name) =>
			use.targets[name as keyof Use['targets']] ===
				undefined ||
			pair?.[name] ===
				use.targets[name as keyof Use['targets']]
	);

// The uses a pair is for: each built-in one it holds, and whether
// targets are left over (Custom).
export const usesOf = (pair: PairTargets) => {
	const held = uses.filter((use) => holdsUse(pair, use));
	const covered = new Set<string>(
		held.flatMap((use) => Object.keys(use.targets))
	);

	return {
		uses: held,
		custom: targetNames.some(
			(name) => pair[name] !== undefined && !covered.has(name)
		)
	};
};

export const hasTarget = (targets: PairTargets) =>
	targetNames.some((name) => targets[name] !== undefined);

// The name of a color to the only color that has it.
const findColor = <T extends {name: string}>(
	name: string,
	colors: T[]
): {color: T} | {error: string} => {
	const found = colors.filter((c) => c.name === name);

	return !found.length
		? {error: `unknown color "${name}"`}
		: found.length > 1
			? {
					error: `"${name}" names ${found.length} colors, give them distinct tokens`
				}
			: {color: found[0]};
};

export type RoleError = {index: number; message: string};

// Maps the names of roles' colors, as `resolvePairs` does. A color
// that does not resolve is reported and left out of its role, a role
// named twice is left out.
export const resolveRoles = <T extends {name: string}>(
	roles: Role[],
	colors: T[]
) => {
	const resolved: Role<T>[] = [];
	const errors: RoleError[] = [];

	roles.forEach(({name, colors: names}, index) => {
		if (resolved.some((role) => role.name === name)) {
			return errors.push({
				index,
				message: `role "${name}" declared twice`
			});
		}

		const members: T[] = [];

		for (const member of names) {
			const found = findColor(member, colors);

			if ('error' in found) {
				errors.push({index, message: found.error});
			} else {
				members.push(found.color);
			}
		}

		resolved.push({name, colors: members});
	});

	return {roles: resolved, errors};
};

// The only place where names are mapped to colors. `colors` are all
// the colors of the tree, hidden ones included. Pairs that do not
// resolve are reported in `errors`, and left out of `pairs`.
export const resolvePairs = <T extends {name: string}>(
	pairs: PresetPair[],
	colors: T[]
) => {
	const resolved: ResolvedPair<T>[] = [];
	const errors: PairError[] = [];
	const seen = new Set<string>();

	pairs.forEach((pair, index) => {
		const fail = (
			message: string,
			field?: PairError['field']
		) => errors.push({index, field, message});

		const find = (field: 'fg' | 'bg') => {
			const found = findColor(pair[field], colors);

			if ('error' in found) {
				fail(found.error, field);
			} else {
				return found.color;
			}
		};

		const fg = find('fg');
		const bg = find('bg');

		if (!fg || !bg) return;

		if (fg === bg) {
			return fail('a color is never combined with itself');
		}

		if (!hasTarget(pair)) {
			return fail(
				'expected at least one target: wcag2, apca or difference'
			);
		}

		// JSON.stringify escapes, so no name can fake another pair
		const key = JSON.stringify([pair.fg, pair.bg]);

		if (seen.has(key)) {
			return fail('declared twice');
		}

		seen.add(key);
		const {wcag2, apca, difference} = pair;
		resolved.push({fg, bg, wcag2, apca, difference});
	});

	return {pairs: resolved, errors};
};

export type RuleError = {
	index: number;
	field?: 'fg' | 'bg' | 'use';
	message: string;
};

// Where the targets of a pair come from: the rules (by index, or the
// key the app gives them), and the one-off pair that replaces them,
// `overrides` being the rules it replaces.
export type PairSources<K = number> = {
	rules: K[];
	overrides: K[];
	oneOff: boolean;
};

export type ExpandedPair<T, K = number> = ResolvedPair<T> & {
	sources: PairSources<K>;
};

// The targets of a rule: its use's, which its own targets override.
export const ruleTargets = (rule: Rule): PairTargets => {
	const use = uses.find(({id}) => id === rule.use);

	return Object.fromEntries(
		targetNames.flatMap((name) => {
			const value =
				rule[name] ??
				use?.targets[name as keyof Use['targets']];
			return value === undefined ? [] : [[name, value]];
		})
	);
};

// The only place where rules become pairs: each color of the fg role
// on each one of the bg role, none on itself; a role among itself
// (no bg) gives each couple once. Rules on the same couple combine,
// the highest goal of each target winning. A one-off pair replaces
// what rules give its couple. Roles are the resolved ones; a rule
// that does not hold is reported in `errors`, and left out.
export const expandRules = <T>(
	roles: Role<T>[],
	rules: Rule[],
	oneOff: ResolvedPair<T>[]
) => {
	type Entry = ExpandedPair<T> & {among: boolean};
	const entries: Entry[] = [];
	const couples = new Map<T, Map<T, Entry>>();
	const errors: RuleError[] = [];
	const get = (fg: T, bg: T) => couples.get(fg)?.get(bg);
	const put = (entry: Entry) => {
		const row = couples.get(entry.fg) ?? new Map<T, Entry>();

		couples.set(entry.fg, row.set(entry.bg, entry));
	};

	rules.forEach((rule, index) => {
		const fail = (
			message: string,
			field?: RuleError['field']
		) => errors.push({index, field, message});
		const find = (field: 'fg' | 'bg', name: string) => {
			const role = roles.find((r) => r.name === name);

			if (!role) fail(`unknown role "${name}"`, field);

			return role;
		};

		if (
			rule.use !== undefined &&
			!uses.some(({id}) => id === rule.use)
		) {
			return fail(`unknown use "${rule.use}"`, 'use');
		}

		const targets = ruleTargets(rule);

		if (!hasTarget(targets)) {
			return fail('expected a use or at least one target');
		}

		const from = find('fg', rule.fg);
		const to =
			rule.bg === undefined || rule.bg === rule.fg
				? from
				: find('bg', rule.bg);

		if (!from || !to) return;

		const among = from === to;
		const fgs = [...new Set(from.colors)];
		const bgs = [...new Set(to.colors)];

		fgs.forEach((fg, i) =>
			bgs.forEach((bg, j) => {
				if (fg === bg || (among && j <= i)) return;

				const entry = get(fg, bg);

				if (!entry) {
					const added = {
						fg,
						bg,
						...targets,
						sources: {
							rules: [index],
							overrides: [],
							oneOff: false
						},
						among
					};

					entries.push(added);
					return put(added);
				}

				for (const name of targetNames) {
					if (targets[name] !== undefined) {
						entry[name] = Math.max(
							entry[name] ?? 0,
							targets[name]
						);
					}
				}

				entry.sources.rules.push(index);
				entry.among &&= among;
			})
		);
	});

	for (const pair of oneOff) {
		const {fg, bg, wcag2, apca, difference} = pair;
		// a difference ignores order, so does a couple from a role
		// among itself
		const reversed = get(bg, fg);
		const replaced =
			get(fg, bg) ?? (reversed?.among ? reversed : undefined);
		const entry: Entry = {
			fg,
			bg,
			wcag2,
			apca,
			difference,
			sources: {
				rules: [],
				overrides: replaced?.sources.rules ?? [],
				oneOff: true
			},
			among: false
		};

		if (replaced) {
			entries[entries.indexOf(replaced)] = entry;
			couples.get(replaced.fg)!.delete(replaced.bg);
		} else {
			entries.push(entry);
		}

		put(entry);
	}

	return {
		pairs: entries.map(
			({among, ...pair}): ExpandedPair<T> => pair
		),
		errors
	};
};

export type TargetCheck = {
	target: (typeof targetNames)[number];
	goal: number;
	level: number;
	simulated: {type: BlindnessType; level: number}[];
	// lowest of `level` and the simulated ones
	minLevel: number;
	pass: boolean;
};

// Each target of a pair, measured as is and under each simulation.
export const checkPair = (
	targets: PairTargets,
	fg: RgbColor,
	bg: RgbColor,
	blindnessTypes: BlindnessType[]
): TargetCheck[] =>
	targetNames.flatMap((target) => {
		const goal = targets[target];

		if (goal === undefined) return [];

		const measure = (fg: RgbColor, bg: RgbColor) =>
			target === 'wcag2'
				? wcag2Contrast(bg, fg)
				: target === 'apca'
					? wcag3Contrast(bg, fg)
					: difference(fg, bg, []).level;

		const level = measure(fg, bg);
		const simulated = blindnessTypes.map((type) => {
			const simulate = simulation(type);
			return {
				type,
				level: measure(simulate(fg), simulate(bg))
			};
		});
		const minLevel = Math.min(
			level,
			...simulated.map((s) => s.level)
		);

		return [
			{
				target,
				goal,
				level,
				simulated,
				minLevel,
				pass: minLevel >= goal
			}
		];
	});
