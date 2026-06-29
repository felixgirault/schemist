import {
	type Rgb,
	filterDeficiencyDeuter,
	filterDeficiencyProt,
	filterDeficiencyTrit
} from 'culori/fn';
import {rgbFromCulori, rgbToCulori} from './culori';
import type {RgbColor} from './types';

const protanomalyFilter = filterDeficiencyProt();
const deuteranomalyFilter = filterDeficiencyDeuter();
const tritanomalyFilter = filterDeficiencyTrit();

export const simulateProtanomaly = (color: RgbColor) =>
	rgbFromCulori(protanomalyFilter(rgbToCulori(color)));

export const simulateDeuteranomaly = (color: RgbColor) =>
	rgbFromCulori(deuteranomalyFilter(rgbToCulori(color)));

export const simulateTritanomaly = (color: RgbColor) =>
	rgbFromCulori(tritanomalyFilter(rgbToCulori(color)));
