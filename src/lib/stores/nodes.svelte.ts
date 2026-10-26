import {formatSchemistToHex} from '#lib/color/formatting.js';
import nearestColor from '#lib/color/nearest.js';
import {parseColor} from '#lib/color/parsing.js';
import type {SchemistColor} from '#lib/color/types.js';
import defs from '#lib/definitions/nodes/index.js';
import type {IdentifiedNodeData, NodeData} from '#lib/tree.js';
import {withoutIndex} from '#lib/utils/arrays.js';
import {uid} from '#lib/utils/generators.js';
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
// ADR 4. Its own `apply` leaves the input unchanged.
export type PresetDef<
	P extends readonly Param[] = readonly Param[]
> = NodeDef<P> & {
	type: PresetType;
	build(args: ArgsOf<P>): NodeData[];
};

export const isPresetDef = (def: NodeDef): def is PresetDef =>
	'build' in def;

export type NodeOutput = [color: SchemistColor, name: string];
export type NodeOutputRecord = Record<Node['id'], NodeOutput>;

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
const applyDef = (
	def: NodeDef,
	args: Args,
	token: string,
	[color, name]: NodeOutput
): NodeOutput => {
	const output = def.apply(color, args);

	return [
		output,
		isPresetDef(def) && !token
			? name
			: generateName(token, output, name)
	];
};

// Gives ids to template nodes, depth-first, so that generated
// colors keep them once expanded.
export const withIds = (
	nodes: NodeData[],
	prefix: string,
	counter = {next: 0}
): IdentifiedNodeData[] =>
	nodes.map(({children, ...node}) => ({
		...node,
		id: `${prefix}.${counter.next++}`,
		...(children && {
			children: withIds(children, prefix, counter)
		})
	}));

// Outputs of all visible nodes of a tree, in tree order, with
// presets replaced by their colors.
export const evaluateTree = (
	nodes: IdentifiedNodeData[],
	input: NodeOutput,
	outputs: NodeOutputRecord = {}
) => {
	nodes.forEach(
		({id, type, token = '', args, isHidden, children}) => {
			const def = defs[type];
			const nodeArgs = {...defaultArgs(def), ...args};
			const output = applyDef(def, nodeArgs, token, input);

			if (isPresetDef(def)) {
				if (!isHidden) {
					evaluateTree(
						withIds(def.build(nodeArgs), id),
						output,
						outputs
					);
				}

				return;
			}

			if (!isHidden) {
				outputs[id] = output;
			}

			if (children) {
				evaluateTree(children, output, outputs);
			}
		}
	);

	return outputs;
};

const defaultInput: NodeOutput = [parseColor('#fff')[1]!, ''];

export class Node {
	readonly id: string;
	// Raw, as definitions are never mutated, only replaced.
	def: NodeDef = $state.raw(defs.clr);
	token = $state('');
	isHidden = $state(false);
	args: Args = $state({});
	children: Node[] = $state([]);
	parent?: Node = $state();
	input: NodeOutput = $derived(
		this.parent?.output ?? defaultInput
	);
	output: NodeOutput = $derived(
		applyDef(this.def, this.args, this.token, this.input)
	);
	// Colors of a preset, keyed by `<preset id>.<index>`.
	generated: NodeOutputRecord = $derived.by(() =>
		isPresetDef(this.def)
			? evaluateTree(
					withIds(this.def.build(this.args), this.id),
					this.output
				)
			: {}
	);

	constructor(
		type: NodeType,
		isHidden = false,
		token = '',
		id = `n${uid()}`
	) {
		this.id = id;
		this.def = defs[type];
		this.isHidden = isHidden;
		this.token = token;
		this.args = defaultArgs(this.def);
	}

	// Keeps the id, token, visibility and children, so that the
	// change is recorded as a single history step.
	setType(type: NodeType) {
		const def = defs[type];
		this.args = remapArgs(this.def, def, this.args);
		this.def = def;
	}

	addChild(child: Node) {
		child.parent?.removeChild(child);
		child.parent = this;
		this.children.push(child);
	}

	removeChild(child: Node) {
		const i = this.children.indexOf(child);

		if (i >= 0) {
			this.children = withoutIndex(this.children, i);
			child.parent = undefined;
		}
	}

	destroy() {
		this.parent?.removeChild(this);
	}

	// Puts the given nodes in place of this one among its
	// siblings.
	replaceWith(nodes: Node[]) {
		const parent = this.parent;

		if (!parent) {
			return;
		}

		nodes.forEach((node) => {
			node.parent?.removeChild(node);
			node.parent = parent;
		});

		const i = parent.children.indexOf(this);
		parent.children = [
			...parent.children.slice(0, i),
			...nodes,
			...parent.children.slice(i + 1)
		];

		this.parent = undefined;
	}
}

export const createNode = (
	type: NodeType,
	isHidden = false,
	token = '',
	id?: string
) => new Node(type, isHidden, token, id);

// Outputs of all visible nodes, in tree order, with presets
// replaced by their colors.
export const collectOutputs = (
	node: Node,
	outputs: NodeOutputRecord = {}
) => {
	if (isPresetDef(node.def)) {
		if (!node.isHidden) {
			Object.assign(outputs, node.generated);
		}
	} else if (!node.isHidden) {
		outputs[node.id] = node.output;
	}

	node.children.forEach((child) =>
		collectOutputs(child, outputs)
	);
	return outputs;
};
