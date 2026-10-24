import {pack} from '#lib/packing/index.js';
import {serializeTree} from '#lib/presets.js';
import type {Node} from '#lib/stores/nodes.svelte.js';

export const permalink = (node: Node) =>
	`${window.location.origin}?preset=${encodeURI(
		pack(serializeTree(node))
	)}`;
