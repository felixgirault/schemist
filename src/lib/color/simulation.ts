import type {Rgb} from 'culori/fn';
import {
	filterDeficiencyDeuter,
	filterDeficiencyProt,
	filterDeficiencyTrit
} from 'culori/fn';

const protanomalyFilter = filterDeficiencyProt();
export const simulateProtanomaly = (color: Rgb) =>
	protanomalyFilter(color);

const deuteranomalyFilter = filterDeficiencyDeuter();
export const simulateDeuteranomaly = (color: Rgb) =>
	deuteranomalyFilter(color);

const tritanomalyFilter = filterDeficiencyTrit();
export const simulateTritanomaly = (color: Rgb) =>
	tritanomalyFilter(color);
