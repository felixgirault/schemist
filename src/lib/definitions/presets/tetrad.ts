import tetradLeft from '#lib/definitions/nodes/tetradLeft.js';
import tetradRight from '#lib/definitions/nodes/tetradRight.js';
import {definePreset} from '#lib/model/definitions.js';

export default definePreset({
	type: 'ttd',
	label: 'Tetrad',
	description: 'Hues evenly spread in four',
	params: [],
	samples: 'discrete',
	apply(color) {
		return color;
	},
	build() {
		return [
			{type: tetradLeft.type, token: 'Left $ tetrad'},
			{type: tetradRight.type, token: 'Right $ tetrad'}
		];
	}
});
