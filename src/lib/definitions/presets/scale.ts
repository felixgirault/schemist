import {definePreset} from '#lib/definitions/define.js';
import lightness from '#lib/definitions/nodes/lightness.js';
import {range} from '#lib/utils/generators.js';

export default definePreset({
	type: 'lsc',
	label: 'Scale',
	argsLabel: ({steps}) => `${steps} steps`,
	description: 'Lightness levels, evenly spread',
	params: [
		{
			type: 'range',
			name: 'steps',
			label: 'Steps',
			min: 1,
			max: 10,
			default: 9
		}
	],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	// Black and white ends are left out, as they are the same
	// whatever the color.
	build({steps}) {
		return range(steps).map((i) => ({
			type: lightness.type,
			args: {
				amount: Math.round((100 * (i + 1)) / (steps + 1))
			}
		}));
	}
});
