import semantics from '#lib/definitions/nodes/semantics.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'Semantic colors',
	description:
		'Colors to convey information, positiveness, danger, negativeness',
	nodes: [{type: semantics.type}]
} satisfies Preset;
