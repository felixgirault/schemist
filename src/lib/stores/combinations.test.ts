import type {BlindnessType} from '#lib/core/contrast.js';
import {combine} from '#lib/core/contrast.js';
import {evaluate} from '#lib/core/evaluate.js';
import {combinations} from '#lib/stores/combinations.svelte.js';
import {
	combinationsTree,
	loadPalette,
	projectCombinations
} from '#lib/testing/tree.js';
import {beforeAll, expect, test} from 'vitest';

beforeAll(() => loadPalette(combinationsTree()));

const blindness: BlindnessType[][] = [
	[],
	['protanomaly', 'deuteranomaly', 'tritanomaly']
];

const cases = (['wcag2', 'wcag3'] as const).flatMap((type) =>
	blindness.map((types) => [type, types] as const)
);

test.each(cases)(
	'combinations with %s and simulations %j',
	(type, types) => {
		combinations.contrastType = type;
		combinations.blindnessTypes = [...types];

		expect(
			projectCombinations(combinations.all)
		).toMatchSnapshot();
	}
);

// The store starts from the hue-sorted, rotated colors, so both
// sides are sorted by pair before comparing.
const byPair = <T extends {bg: string; fg: string}>(all: T[]) =>
	[...all].sort((a, b) =>
		`${a.bg}|${a.fg}`.localeCompare(`${b.bg}|${b.fg}`)
	);

test.each(cases)(
	'combine matches the store with %s and simulations %j',
	(type, types) => {
		combinations.contrastType = type;
		combinations.blindnessTypes = [...types];

		const entries = evaluate(combinationsTree());

		expect(
			byPair(
				projectCombinations(
					combine(entries, entries, type, types)
				)
			)
		).toEqual(byPair(projectCombinations(combinations.all)));
	}
);

test('differences hold one entry per unordered pair', () => {
	combinations.colorFilters = [];
	combinations.blindnessTypes = [];

	const colors = combinations.sortedColors;
	const {differences} = combinations;

	expect(differences).toHaveLength(
		(colors.length * (colors.length - 1)) / 2
	);
	expect(differences[0]!.id).toBe(
		`${colors[0]!.id}-${colors[1]!.id}`
	);
	expect(differences.at(-1)!.id).toBe(
		`${colors.at(-2)!.id}-${colors.at(-1)!.id}`
	);
	expect(
		differences.every(({simulated}) => !simulated.length)
	).toBe(true);
});

test('differences include the simulations', () => {
	combinations.colorFilters = [];
	combinations.blindnessTypes = ['protanomaly', 'tritanomaly'];

	for (const {
		simulated,
		level,
		minLevel
	} of combinations.differences) {
		expect(simulated.map(({type}) => type)).toEqual([
			'protanomaly',
			'tritanomaly'
		]);
		expect(minLevel).toBeLessThanOrEqual(level);
	}
});

test('differences follow the colors filter', () => {
	const [a, b, c] = combinations.sortedColors.map(({id}) => id);
	combinations.blindnessTypes = [];
	combinations.colorFilters = [c!, a!, b!];

	expect(combinations.differences.map(({id}) => id)).toEqual([
		`${a}-${b}`,
		`${a}-${c}`,
		`${b}-${c}`
	]);

	combinations.colorFilters = [];
});
