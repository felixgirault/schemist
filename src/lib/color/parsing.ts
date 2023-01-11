import {parse, parseHex} from 'culori/fn';
import {
	hslToSchemist,
	lchToSchemist,
	rgbToSchemist
} from './conversion';
import {
	hslFromCulori,
	lchFromCulori,
	rgbFromCulori
} from './culori';
import type {ColorFormat} from './formatting';
import type {SchemistColor} from './types';

export const parseColor = (
	color: string
): [format: ColorFormat, color: SchemistColor] | [] => {
	const hex = parseHex(color);

	if (hex) {
		return ['hex', rgbToSchemist(rgbFromCulori(hex))];
	}

	const parsed = parse(color);

	switch (parsed?.mode) {
		case 'rgb':
			return ['rgb', rgbToSchemist(rgbFromCulori(parsed))];
		case 'hsl':
			return ['hsl', hslToSchemist(hslFromCulori(parsed))];
		case 'lch':
			return ['lch', lchToSchemist(lchFromCulori(parsed))];
		default:
			return [];
	}
};
