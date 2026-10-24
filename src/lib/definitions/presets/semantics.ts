import informative from '#lib/definitions/nodes/informative.js';
import negative from '#lib/definitions/nodes/negative.js';
import positive from '#lib/definitions/nodes/positive.js';
import warning from '#lib/definitions/nodes/warning.js';
import type {Preset} from '#lib/presets.js';

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
} satisfies Preset;
