import informative from '$lib/definitions/nodes/informative';
import negative from '$lib/definitions/nodes/negative';
import positive from '$lib/definitions/nodes/positive';
import warning from '$lib/definitions/nodes/warning';
import type {Preset} from '$lib/presets';

export default {
	label: 'Semantic colors',
	description:
		'Colors to convey information, positiveness, danger, negativeness',
	nodes: [
		{
			type: informative.type,
			token: 'Info'
		},
		{
			type: positive.type,
			token: 'Success'
		},
		{
			type: warning.type,
			token: 'Warning'
		},
		{
			type: negative.type,
			token: 'Error'
		}
	]
} as Preset;
