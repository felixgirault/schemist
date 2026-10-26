import type {SchemistColor} from '#lib/color/types.js';
import type {NodeData} from '#lib/model/tree.js';

// Codes of node types, which are stored in permalinks, so they
// must never change.
export type ColorType =
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

export type PresetType =
	| 'hrm'
	| 'lsc'
	| 'mad'
	| 'mal'
	| 'mnd'
	| 'mnl'
	| 'mtd'
	| 'mtl'
	| 'ntl'
	| 'rnb'
	| 'sch'
	| 'smp'
	| 'sem'
	| 'spc'
	| 'stt'
	| 'trd'
	| 'ttd';

export type NodeType = ColorType | PresetType;

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

// A node whose colors are generated from a template tree, see
// ADR 4. Its own `apply` leaves the input unchanged.
export type PresetDef<
	P extends readonly Param[] = readonly Param[]
> = NodeDef<P> & {
	type: PresetType;
	build(args: ArgsOf<P>): NodeData[];
};

export const isPresetDef = (def: NodeDef): def is PresetDef =>
	'build' in def;

export const defaultArgs = (def: NodeDef) =>
	Object.fromEntries(
		def.params.map(({name, default: d}) => [name, d])
	);

const isSameParam = (a: Param, b: Param) =>
	a.type === b.type &&
	(a.type !== 'range' ||
		(b.type === 'range' &&
			a.min === b.min &&
			a.max === b.max));

// Types share param names with different meanings (e.g. the
// `amount` of a lightness or of a highlight), so args are only
// kept when the new type has the exact same param, see ADR 3.
export const remapArgs = (
	from: NodeDef,
	to: NodeDef,
	args: Args
): Args =>
	Object.fromEntries(
		to.params.map((param) => {
			const previous = from.params.find(
				({name}) => name === param.name
			);

			return [
				param.name,
				previous && isSameParam(previous, param)
					? args[param.name]
					: param.default
			];
		})
	);

// Infers args from params, and keeps the type code as is, so
// that registries can check it. This module only imports types,
// as the module of nodes loads definitions.
export const defineNode = <
	const T extends ColorType,
	const P extends readonly Param[]
>(
	def: NodeDef<P> & {type: T}
) => def;

export const definePreset = <
	const T extends PresetType,
	const P extends readonly Param[]
>(
	def: PresetDef<P> & {type: T}
) => def;
