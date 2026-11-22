import {formatSchemistToHex} from '#lib/color/formatting.js';
import nearestColor from '#lib/color/nearest.js';
import {parseColor} from '#lib/color/parsing.js';
import type {SchemistColor} from '#lib/color/types.js';
import {sentenceCase} from '#lib/utils/strings.js';

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
// ADR 7. Its own `apply` leaves the input unchanged.
export type PresetDef<
	P extends readonly Param[] = readonly Param[]
> = NodeDef<P> & {
	type: PresetType;
	build(args: ArgsOf<P>): NodeData[];
};

export const isPresetDef = (def: NodeDef): def is PresetDef =>
	'build' in def;

// Infers args from params, and keeps the type code as is, so
// that the registry can check it.
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

export type NodeOutput = {color: SchemistColor; name: string};

// Input of the root.
export const defaultInput: NodeOutput = {
	color: parseColor('#fff')[1]!,
	name: ''
};

export const defaultArgs = (def: NodeDef): Args =>
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
// kept when the new type has the exact same param, see ADR 8.
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

// A preset is named after its parent unless it has a token, so
// that `$` in the tokens of its colors still makes sense.
export const applyDef = (
	def: NodeDef,
	args: Args,
	token: string,
	input: NodeOutput
): NodeOutput => {
	const color = def.apply(input.color, args);

	return {
		color,
		name:
			isPresetDef(def) && !token
				? input.name
				: generateName(token, color, input.name)
	};
};

export type PairTargets = {
	wcag2?: number;
	apca?: number;
	difference?: number;
};

// A pair as saved: the names of its two colors, and its targets.
export type PresetPair = PairTargets & {fg: string; bg: string};

// A named group of colors: names as saved, ids in the app.
export type Role<T = string> = {name: string; colors: T[]};

// A rule: the colors of role `fg` on those of role `bg`, or a role
// among itself with no `bg`. Roles are named. Targets are the
// `use`'s (ADR 14), which the explicit ones override, so a Custom
// rule has no `use`.
export type Rule = PairTargets & {
	fg: string;
	bg?: string;
	use?: string;
};

export type NodeData = {
	// Set when serializing a tree, to restore it as is, and when a
	// preset is expanded into the nodes it generated.
	id?: string;
	type: NodeType;
	token?: string;
	args?: Args;
	children?: NodeData[];
	isHidden?: boolean;
	// root only
	pairs?: PresetPair[];
	roles?: Role[];
	rules?: Rule[];
};

// A tree whose ids are all set, once serialized or numbered.
export type IdentifiedNodeData = Omit<
	NodeData,
	'id' | 'children'
> & {
	id: string;
	children?: IdentifiedNodeData[];
};
