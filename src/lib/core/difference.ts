import {rgbToCulori} from '#lib/color/culori.js';
import type {RgbColor} from '#lib/color/types.js';
import type {BlindnessType} from '#lib/core/contrast.js';
import {simulation} from '#lib/core/contrast.js';
import {differenceCiede2000} from 'culori/fn';

const ciede2000 = differenceCiede2000();

const distance = (a: RgbColor, b: RgbColor) =>
	ciede2000(rgbToCulori(a), rgbToCulori(b));

export type Difference = {
	level: number;
	simulated: {type: BlindnessType; level: number}[];
	minLevel: number;
};

// CIEDE2000 between two colors, as is and under each simulation.
export const difference = (
	a: RgbColor,
	b: RgbColor,
	blindnessTypes: BlindnessType[]
): Difference => {
	const level = distance(a, b);

	const simulated = blindnessTypes.map((type) => {
		const simulate = simulation(type);
		return {type, level: distance(simulate(a), simulate(b))};
	});

	return {
		level,
		simulated,
		minLevel: Math.min(level, ...simulated.map((s) => s.level))
	};
};
