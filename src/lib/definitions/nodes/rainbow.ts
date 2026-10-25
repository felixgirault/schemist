import type {GroupDef} from '#lib/stores/nodes.svelte.js';
import {range} from '#lib/utils/generators.js';
import hue from './hue';

export default {
	type: 'rnb',
	label: 'Rainbow',
	argsLabel: ({count}) => `${count} colors`,
	description: 'Hues evenly spread around the color wheel',
	params: [
		{
			type: 'range',
			name: 'count',
			label: 'Colors',
			min: 1,
			max: 23,
			default: 11
		}
	],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	// Hue nodes rather than analogous ones, whose 30° steps can't
	// spread any count of colors.
	build({count}) {
		return range(count).map((i) => ({
			type: hue.type,
			args: {
				degrees: Math.round((360 * (i + 1)) / (count + 1))
			}
		}));
	}
} satisfies GroupDef;
