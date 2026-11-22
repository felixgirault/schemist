import {parseColor} from '#lib/color/parsing.js';
import type {Combination} from '#lib/core/contrast.js';
import type {NodeData} from '#lib/core/nodes.js';
import color from '#lib/definitions/nodes/color.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {parseTree} from '#lib/tree.js';

export const rootTree = (hex: string, nodes: NodeData[]) => ({
	type: color.type,
	args: {color: parseColor(hex)[1]!},
	children: nodes
});

// Loads a tree in the palette store. Vitest compiles components for
// the server, where $effect never runs, so the debounced outputs
// are set the way the palette's effect would.
export const loadPalette = (tree: NodeData) => {
	palette.root = parseTree(tree);
	palette.settledOutputs = palette.outputs;
};

// Tree shared by the combinations tests.
export const combinationsTree = () =>
	rootTree('#3b82f6', [{type: 'smp'}, {type: 'ntl'}]);

// Combinations without uids, which hold node ids.
export const projectCombinations = (all: Combination[]) =>
	all.map((c) => ({
		bg: c.bgName,
		fg: c.fgName,
		level: c.contrast.level,
		grade: c.contrast.grade,
		minLevel: c.minLevel,
		minGrade: c.minGrade,
		simulated: c.simulatedContrasts.map(
			({type, level, grade}) => ({type, level, grade})
		)
	}));
