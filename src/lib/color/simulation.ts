import {
	type Culori,
	filterDeficiencyDeuter,
	filterDeficiencyProt,
	filterDeficiencyTrit
} from 'culori/fn';
import {rgbFromCulori, rgbToCulori} from './culori';
import type {RgbColor} from './types';

const protanomalyFilter = filterDeficiencyProt<Culori.Rgb>();
const deuteranomalyFilter = filterDeficiencyDeuter<Culori.Rgb>();
const tritanomalyFilter = filterDeficiencyTrit<Culori.Rgb>();

export const simulateProtanomaly = (color: RgbColor) =>
	rgbFromCulori(protanomalyFilter(rgbToCulori(color)));

export const simulateDeuteranomaly = (color: RgbColor) =>
	rgbFromCulori(deuteranomalyFilter(rgbToCulori(color)));

export const simulateTritanomaly = (color: RgbColor) =>
	rgbFromCulori(tritanomalyFilter(rgbToCulori(color)));
