import {pack} from '$lib/packing';
import {serializeTree} from '$lib/presets';
import type {Node} from '$lib/stores/nodes';

export const permalink = (node: Node) =>
	`${window.location.origin}?preset=${encodeURI(
		pack(serializeTree(node))
	)}`;
