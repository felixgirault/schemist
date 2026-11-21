import {parseColor} from '#lib/color/parsing.js';
import color from '#lib/definitions/nodes/color.js';
import type {PresetNode} from '#lib/presets.js';
import {parseTree} from '#lib/presets.js';
import {palette} from '#lib/stores/palette.svelte.js';

export const rootTree = (hex: string, nodes: PresetNode[]) => ({
	type: color.type,
	args: {color: parseColor(hex)[1]!},
	children: nodes
});

// Loads a tree in the palette store. Vitest compiles components for
// the server, where $effect never runs, so the debounced outputs
// are set the way the palette's effect would.
export const loadPalette = (tree: PresetNode) => {
	palette.root = parseTree(tree);
	palette.debouncedOutputs = palette.outputs;
};
