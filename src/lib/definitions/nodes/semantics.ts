import type {GroupDef} from '#lib/stores/nodes.svelte.js';
import informative from './informative';
import negative from './negative';
import positive from './positive';
import warning from './warning';

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
} satisfies GroupDef;
