import highlight from '#lib/definitions/nodes/highlight.js';
import shadow from '#lib/definitions/nodes/shadow.js';
import type {PresetDef} from '#lib/stores/nodes.svelte.js';

export default {
	type: 'stt',
	label: 'States',
	argsLabel: ({amount}) => `${amount}%`,
	description: 'Highlight and shadow',
	params: [
		{
			type: 'range',
			name: 'amount',
			label: 'Amount',
			unit: '%',
			min: 0,
			max: 50,
			default: 10
		}
	],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	build({amount}) {
		return [
			{
				type: highlight.type,
				token: '$ light',
				args: {amount}
			},
			{type: shadow.type, token: '$ dark', args: {amount}}
		];
	}
} satisfies PresetDef;
