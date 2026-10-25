import informative from '#lib/definitions/nodes/informative.js';
import negative from '#lib/definitions/nodes/negative.js';
import positive from '#lib/definitions/nodes/positive.js';
import warning from '#lib/definitions/nodes/warning.js';
import type {PresetDef} from '#lib/stores/nodes.svelte.js';

export default {
	type: 'sem',
	label: 'Semantic colors',
	description:
		'Colors to convey information, positiveness, danger, negativeness',
	params: [],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	build() {
		return [
			{type: informative.type, token: 'Info'},
			{type: positive.type, token: 'Success'},
			{type: warning.type, token: 'Warning'},
			{type: negative.type, token: 'Error'}
		];
	}
} satisfies PresetDef;
