import {definePreset} from '#lib/model/definitions.js';
import splitComplementary from './splitComplementary';
import tetrad from './tetrad';
import triad from './triad';

export default definePreset({
	type: 'hrm',
	label: 'Harmonies',
	description: 'Color harmonies of your choice',
	params: [
		{
			type: 'boolean',
			name: 'tetrad',
			label: 'Tetrad',
			default: true
		},
		{
			type: 'boolean',
			name: 'triad',
			label: 'Triad',
			default: true
		},
		{
			type: 'boolean',
			name: 'split',
			label: 'Split complementary',
			default: true
		}
	],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	// Left harmonies first, then right ones, from the farthest
	// hue to the closest and back.
	build(args) {
		const pairs = (
			[
				[args.tetrad, tetrad],
				[args.triad, triad],
				[args.split, splitComplementary]
			] as const
		).flatMap(([isEnabled, preset]) =>
			isEnabled ? [preset.build({})] : []
		);

		return [
			...pairs.map(([left]) => left),
			...pairs.reverse().map(([, right]) => right)
		];
	}
});
