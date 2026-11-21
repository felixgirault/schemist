import {formatSchemistToHex} from '#lib/color/formatting.js';
import nearestColor from '#lib/color/nearest.js';
import type {SchemistColor} from '#lib/color/types.js';
import type defs from '#lib/definitions/nodes/index.js';
import {sentenceCase} from '#lib/utils/strings.js';

export type SampleType = 'single' | 'discrete' | 'continuous';

export type BooleanParam = {
	type: 'boolean';
	name: string;
	label: string;
	default: boolean;
};

export type ColorParam = {
	type: 'color';
	name: string;
	label: string;
	default: SchemistColor;
};

export type RangeParam = {
	type: 'range';
	name: string;
	label: string;
	unit?: string;
	min: number;
	max: number;
	default: number;
};

export type Param = BooleanParam | ColorParam | RangeParam;

export type Args = {
	[name: string]: any;
};

export type NodeDef = {
	type: string;
	label: string;
	argsLabel?: (args: Args) => string;
	description?: string;
	params: Param[];
	samples: SampleType;
	apply: (color: SchemistColor, args: Args) => SchemistColor;
};

export type NodeOutput = [color: SchemistColor, name: string];

export const defaultArgs = (def: NodeDef) =>
	Object.fromEntries(
		def.params.map(({name, default: d}) => [name, d])
	);

export const generateName = (
	token: string,
	color: SchemistColor,
	parentColorName?: string
) =>
	token
		? parentColorName
			? token.replace('$', parentColorName)
			: token
		: sentenceCase(nearestColor(formatSchemistToHex(color)));

export type PresetNode = {
	type: keyof typeof defs;
	token?: string;
	args?: Args;
	children?: PresetNode[];
	isHidden?: boolean;
};

export type Preset = {
	label: string;
	description?: string;
	nodes: PresetNode[];
};
