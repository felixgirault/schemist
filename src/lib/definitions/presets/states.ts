import highlight from '$lib/definitions/nodes/highlight';
import shadow from '$lib/definitions/nodes/shadow';
import type {Preset} from '$lib/presets';

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
} as Preset;
