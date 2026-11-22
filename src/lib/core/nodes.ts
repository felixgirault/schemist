import {formatSchemistToHex} from '#lib/color/formatting.js';
import nearestColor from '#lib/color/nearest.js';
import type {SchemistColor} from '#lib/color/types.js';
import {sentenceCase} from '#lib/utils/strings.js';

// Codes of node types, which are stored in permalinks, so they
// must never change.
export type NodeType =
	| 'anl'
	| 'clr'
	| 'cmp'
	| 'ctr'
	| 'h'
	| 'hlt'
	| 'inf'
	| 'l'
	| 'neg'
	| 'pos'
	| 's'
	| 'scl'
	| 'scr'
	| 'sdw'
	| 'trl'
	| 'trr'
	| 'ttl'
	| 'ttr'
	| 'wrn';

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

export type ParamValue<P extends Param = Param> =
	P extends RangeParam
		? number
		: P extends BooleanParam
			? boolean
			: SchemistColor;

// Args of a list of params, keyed by their names.
export type ArgsOf<P extends readonly Param[]> = {
	[K in P[number] as K['name']]: ParamValue<K>;
};

export type Args = Record<string, ParamValue>;

// Args hold values of the kind of their param, as they start
// from defaults and are only set by fields of that kind.
export const argOf = <P extends Param>(args: Args, param: P) =>
	args[param.name] as ParamValue<P>;

// Methods rather than function properties, so that definitions of
// any params fit `NodeDef` (methods are bivariant).
export type NodeDef<
	P extends readonly Param[] = readonly Param[]
> = {
	type: NodeType;
	label: string;
	argsLabel?(args: ArgsOf<P>): string;
	description?: string;
	params: P;
	samples: SampleType;
	apply(color: SchemistColor, args: ArgsOf<P>): SchemistColor;
};

// Infers args from params, and keeps the type code as is, so
// that the registry can check it.
export const defineNode = <
	const T extends NodeType,
	const P extends readonly Param[]
>(
	def: NodeDef<P> & {type: T}
) => def;

export type NodeOutput = {color: SchemistColor; name: string};

export const defaultArgs = (def: NodeDef): Args =>
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

export type NodeData = {
	type: NodeType;
	token?: string;
	args?: Args;
	children?: NodeData[];
	isHidden?: boolean;
};

export type Preset = {
	label: string;
	description?: string;
	nodes: NodeData[];
};
