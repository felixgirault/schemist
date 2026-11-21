import presets from '#lib/definitions/presets/index.js';
import type {BlindnessType} from '#lib/stores/combinations.svelte.js';
import {combinations} from '#lib/stores/combinations.svelte.js';
import {loadPalette, rootTree} from '#lib/testing/tree.js';
import {afterAll, beforeAll, expect, test, vi} from 'vitest';

beforeAll(() => {
	loadPalette(
		rootTree('#3b82f6', [
			...presets.find(
				({label}) => label === 'Semantic colors'
			)!.nodes
		])
	);
});

const blindness: BlindnessType[][] = [
	[],
	['protanomaly', 'deuteranomaly', 'tritanomaly']
];

test.each(
	(['wcag2', 'wcag3'] as const).flatMap((type) =>
		blindness.map((types) => [type, types] as const)
	)
)('combinations with %s and simulations %j', (type, types) => {
	combinations.contrastType = type;
	combinations.blindnessTypes = [...types];

	// uids hold node ids, which depend on a global counter
	expect(
		combinations.all.map((c) => ({
			bg: c.bgName,
			fg: c.fgName,
			level: c.contrast.level,
			grade: c.contrast.grade,
			minLevel: c.minLevel,
			minGrade: c.minGrade,
			simulated: c.simulatedContrasts.map(
				({type, level, grade}) => ({type, level, grade})
			)
		}))
	).toMatchSnapshot();
});
