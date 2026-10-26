import triadLeft from '#lib/definitions/nodes/triadLeft.js';
import triadRight from '#lib/definitions/nodes/triadRight.js';
import {definePreset} from '#lib/model/definitions.js';

export default definePreset({
	type: 'trd',
	label: 'Triad',
	description: 'Hues evenly spread in three',
	params: [],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	build() {
		return [
			{type: triadLeft.type, token: 'Left $ triad'},
			{type: triadRight.type, token: 'Right $ triad'}
		];
	}
});
