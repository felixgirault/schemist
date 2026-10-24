import {pack} from '#lib/packing/index.js';
import {serializeTree} from '#lib/presets.js';
import type {Node} from '#lib/stores/nodes.svelte.js';

// encodeURI keeps the link readable, but leaves characters that
// are meaningful in a query string.
export const permalink = (node: Node) =>
	`${window.location.origin}?preset=${encodeURI(
		pack(serializeTree(node))
	).replace(/[&#+]/g, encodeURIComponent)}`;
