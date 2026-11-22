import {
	wcag2Contrast,
	wcag3Contrast
} from '#lib/color/contrast.js';
import type {RgbColor} from '#lib/color/types.js';
import type {BlindnessType} from '#lib/core/contrast.js';
import {simulation} from '#lib/core/contrast.js';
import {difference} from '#lib/core/difference.js';
import type {PairTargets, PresetPair} from '#lib/core/nodes.js';

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
			const name = pair[field];
			const found = colors.filter((c) => c.name === name);

			if (!found.length) {
				fail(`unknown color "${name}"`, field);
			} else if (found.length > 1) {
				fail(
					`"${name}" names ${found.length} colors, give them distinct tokens`,
					field
				);
			} else {
				return found[0];
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
