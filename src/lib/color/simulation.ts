import {
	type Rgb,
	clampRgb,
	filterDeficiencyDeuter,
	filterDeficiencyProt,
	filterDeficiencyTrit
} from 'culori/fn';
import {rgbFromCulori, rgbToCulori} from './culori';
import type {RgbColor} from './types';

// Filters can yield colors out of the sRGB gamut, which
// can't be displayed and break APCA calculations (see #46).
const simulate =
	(filter: (color: Rgb) => Rgb) => (color: RgbColor) =>
		rgbFromCulori(clampRgb(filter(rgbToCulori(color))) as Rgb);

export const simulateProtanomaly = simulate(
	filterDeficiencyProt()
);
export const simulateDeuteranomaly = simulate(
	filterDeficiencyDeuter()
);
export const simulateTritanomaly = simulate(
	filterDeficiencyTrit()
);
