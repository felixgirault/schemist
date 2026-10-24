import {pack} from '#lib/packing/index.js';
import type {PresetNode} from '#lib/presets.js';
import {serializeTree} from '#lib/presets.js';
import type {Node} from '#lib/stores/nodes.svelte.js';

// encodeURI keeps the link readable, but leaves characters that
// are meaningful in a query string.
export const presetQuery = (tree: PresetNode) =>
	`?preset=${encodeURI(pack(tree)).replace(
		/[&#+]/g,
		encodeURIComponent
	)}`;

export const permalink = (node: Node) =>
	`${window.location.origin}${presetQuery(serializeTree(node))}`;
