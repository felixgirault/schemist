import {formatSchemistToHex} from '#lib/color/formatting.js';
import nearestColor from '#lib/color/nearest.js';
import {parseColor} from '#lib/color/parsing.js';
import type {SchemistColor} from '#lib/color/types.js';
import defs from '#lib/definitions/nodes/index.js';
import type {PresetNode} from '#lib/presets.js';
import {withoutIndex} from '#lib/utils/arrays.js';
import {uid} from '#lib/utils/generators.js';
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

// A node whose colors are generated from a template tree, see
// ADR 4. Its own `apply` leaves the input unchanged.
export type GroupDef = NodeDef & {
	build: (args: Args) => PresetNode[];
};

export const isGroupDef = (def: NodeDef): def is GroupDef =>
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

// A group is named after its parent unless it has a token, so
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
		isGroupDef(def) && !token
			? name
			: generateName(token, output, name)
	];
};

// Gives ids to template nodes, depth-first, so that generated
// colors keep them once ungrouped.
export const withIds = (
	nodes: PresetNode[],
	prefix: string,
	counter = {next: 0}
): PresetNode[] =>
	nodes.map(({children, ...node}) => ({
		...node,
		id: `${prefix}.${counter.next++}`,
		...(children && {
			children: withIds(children, prefix, counter)
		})
	}));

// Outputs of all visible nodes of a tree, in tree order, with
// groups replaced by their colors.
export const evaluateTree = (
	nodes: PresetNode[],
	input: NodeOutput,
	outputs: NodeOutputRecord = {}
) => {
	nodes.forEach(
		({id, type, token = '', args, isHidden, children}) => {
			const def = defs[type];
			const nodeArgs = {...defaultArgs(def), ...args};
			const output = applyDef(def, nodeArgs, token, input);

			if (isGroupDef(def)) {
				if (!isHidden) {
					evaluateTree(
						withIds(def.build(nodeArgs), id!),
						output,
						outputs
					);
				}

				return;
			}

			if (!isHidden) {
				outputs[id!] = output;
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
	// Colors of a group, keyed by `<group id>.<index>`.
	generated: NodeOutputRecord = $derived.by(() =>
		isGroupDef(this.def)
			? evaluateTree(
					withIds(this.def.build(this.args), this.id),
					this.output
				)
			: {}
	);

	constructor(
		type: keyof typeof defs,
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
	setType(type: keyof typeof defs) {
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
	type: keyof typeof defs,
	isHidden = false,
	token = '',
	id?: string
) => new Node(type, isHidden, token, id);

// Outputs of all visible nodes, in tree order, with groups
// replaced by their colors.
export const collectOutputs = (
	node: Node,
	outputs: NodeOutputRecord = {}
) => {
	if (isGroupDef(node.def)) {
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
