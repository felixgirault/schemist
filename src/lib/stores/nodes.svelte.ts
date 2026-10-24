import {formatSchemistToHex} from '#lib/color/formatting.js';
import nearestColor from '#lib/color/nearest.js';
import {parseColor} from '#lib/color/parsing.js';
import type {SchemistColor} from '#lib/color/types.js';
import defs from '#lib/definitions/nodes/index.js';
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
	output: NodeOutput = $derived.by(() => {
		const color = this.def.apply(this.input[0], this.args);
		const name = generateName(
			this.token,
			color,
			this.input[1]
		);
		return [color, name];
	});

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
}

export const createNode = (
	type: keyof typeof defs,
	isHidden = false,
	token = '',
	id?: string
) => new Node(type, isHidden, token, id);

// Outputs of all visible nodes, in tree order.
export const collectOutputs = (
	node: Node,
	outputs: NodeOutputRecord = {}
) => {
	if (!node.isHidden) {
		outputs[node.id] = node.output;
	}

	node.children.forEach((child) =>
		collectOutputs(child, outputs)
	);
	return outputs;
};
