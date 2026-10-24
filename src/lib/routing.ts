import type {PresetNode} from '#lib/core/nodes.js';
import {pack} from '#lib/packing/index.js';

// encodeURI keeps the link readable, but leaves characters that
// are meaningful in a query string.
export const permalink = (tree: PresetNode, origin: string) =>
	`${origin}?preset=${encodeURI(pack(tree)).replace(
		/[&#+]/g,
		encodeURIComponent
	)}`;
