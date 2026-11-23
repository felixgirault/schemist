import {parseColor} from '#lib/color/parsing.js';
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
	palette.settle();
};
