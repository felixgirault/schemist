import type {PresetNode} from '#lib/core/nodes.js';
import {pack} from '#lib/packing/index.js';

export const permalink = (tree: PresetNode, origin: string) =>
	`${origin}?preset=${encodeURI(pack(tree))}`;
