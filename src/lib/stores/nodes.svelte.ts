import defs from '#lib/definitions/nodes/index.js';
import type {
	Args,
	NodeDef,
	NodeType
} from '#lib/model/definitions.js';
import {
	defaultArgs,
	isPresetDef,
	remapArgs
} from '#lib/model/definitions.js';
import type {
	IdentifiedNodeData,
	NodeData,
	NodeOutput,
	NodeOutputRecord
} from '#lib/model/tree.js';
import {
	applyDef,
	defaultInput,
	evaluateTree,
	hideTree,
	withIds
} from '#lib/model/tree.js';
import {withoutIndex} from '#lib/utils/arrays.js';
import {uid} from '#lib/utils/generators.js';

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

export const parseTree = (data: NodeData) => {
	const {id, type, isHidden, token, args, children} = data;
	const node = createNode(type, isHidden, token, id);

	if (args) {
		Object.assign(node.args, args);
	}

	// Presets generate their colors, and can't have children.
	if (children && !isPresetDef(node.def)) {
		children.forEach((child) => {
			node.addChild(parseTree(child));
		});
	}

	return node;
};

// Replaces a preset with the plain nodes it builds, in a single
// change. They keep the ids of the colors they generated, see
// ADR 4.
export const expandPreset = (preset: Node) => {
	const {def, args, token, isHidden} = preset;

	if (!preset.parent || !isPresetDef(def)) {
		return;
	}

	const trees = withIds(def.build(args), preset.id).map(
		(tree) => {
			// `$` referred to the preset, which is going away.
			const named =
				token && tree.token
					? {...tree, token: tree.token.replace('$', token)}
					: tree;

			return isHidden ? hideTree(named) : named;
		}
	);

	preset.replaceWith(trees.map(parseTree));
};

export const serializeTree = (node: Node) => {
	const {token, args, children} = node;
	const data: IdentifiedNodeData = {
		id: node.id,
		type: node.def.type,
		isHidden: node.isHidden
	};

	if (token) {
		data.token = token;
	}

	if (Object.keys(args).length) {
		data.args = args;
	}

	if (children.length) {
		data.children = children.map(serializeTree);
	}

	return data;
};
