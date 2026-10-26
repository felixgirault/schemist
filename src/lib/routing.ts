import {pack} from '#lib/packing/index.js';
import type {Node} from '#lib/stores/nodes.svelte.js';
import type {NodeData} from '#lib/tree.js';
import {serializeTree} from '#lib/tree.js';

// encodeURI keeps the link readable, but leaves characters that
// are meaningful in a query string.
export const presetQuery = (tree: NodeData) =>
	`?preset=${encodeURI(pack(tree)).replace(
		/[&#+]/g,
		encodeURIComponent
	)}`;

export const permalink = (node: Node) =>
	`${window.location.origin}${presetQuery(serializeTree(node))}`;
