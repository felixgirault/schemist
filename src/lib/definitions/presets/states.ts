import highlight from '#lib/definitions/nodes/highlight.js';
import shadow from '#lib/definitions/nodes/shadow.js';
import type {Preset} from '#lib/presets.js';

export default {
	label: 'States',
	description: 'Highlight and shadow',
	nodes: [
		{
			type: highlight.type,
			token: '$ light'
		},
		{
			type: shadow.type,
			token: '$ dark'
		}
	]
} satisfies Preset;
