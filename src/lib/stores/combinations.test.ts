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
