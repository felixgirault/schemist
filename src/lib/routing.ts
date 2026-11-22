import type {NodeData} from '#lib/core/nodes.js';
import {pack} from '#lib/packing/index.js';

// encodeURI keeps the link readable, but leaves characters that
// are meaningful in a query string.
export const presetQuery = (tree: NodeData) =>
	`?preset=${encodeURI(pack(tree)).replace(
		/[&#+]/g,
		encodeURIComponent
	)}`;

export const permalink = (tree: NodeData, origin: string) =>
	`${origin}${presetQuery(tree)}`;
