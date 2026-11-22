import {evaluateNodes} from '#lib/core/evaluate.js';
import type {
	Args,
	NodeDef,
	NodeOutput,
	NodeType
} from '#lib/core/nodes.js';
import {
	applyDef,
	defaultArgs,
	defaultInput,
	isPresetDef,
	remapArgs
} from '#lib/core/nodes.js';
import type {ResolvedPair} from '#lib/core/pairs.js';
import defs from '#lib/definitions/index.js';
import {withoutIndex} from '#lib/utils/arrays.js';
import {uid} from '#lib/utils/generators.js';

export type NodeOutputRecord = Record<Node['id'], NodeOutput>;

export class Node {
	readonly id: string;
	// Raw, as definitions are never mutated, only replaced.
	def: NodeDef = $state.raw(defs.clr);
	token = $state('');
	isHidden = $state(false);
	args: Args = $state({});
	// Only changed through the tree methods, which keep both ends
	// of a link in sync.
	#children: Node[] = $state([]);
	#parent?: Node = $state();
	input: NodeOutput = $derived(
		this.#parent?.output ?? defaultInput
	);
	output: NodeOutput = $derived.by(() =>
		applyDef(this.def, this.args, this.token, this.input)
	);
	// Colors of a preset, keyed by `<preset id>.<index>`.
	generated: NodeOutputRecord = $derived.by(() => {
		const {def, args, output, id} = this;

		return isPresetDef(def)
			? Object.fromEntries(
					evaluateNodes(
						def.build(args),
						output,
						`${id}.`
					).map(({id, color, name}) => [id, {color, name}])
				)
			: {};
	});

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

		// Presets generate their colors, and can't have children.
		if (isPresetDef(def) && this.#children.length) {
			throw new Error(
				"A node with children can't be a preset."
			);
		}

		this.args = remapArgs(this.def, def, this.args);
		this.def = def;
	}

	get children(): readonly Node[] {
		return this.#children;
	}

	get parent() {
		return this.#parent;
	}

	addChild(child: Node) {
		if (isPresetDef(this.def)) {
			throw new Error("A preset can't have children.");
		}

		child.#parent?.removeChild(child);
		child.#parent = this;
		this.#children.push(child);
	}

	removeChild(child: Node) {
		const i = this.#children.indexOf(child);

		if (i >= 0) {
			this.#children = withoutIndex(this.#children, i);
			child.#parent = undefined;
		}
	}

	destroy() {
		this.#parent?.removeChild(this);
	}

	// Puts the given nodes in place of this one among its
	// siblings.
	replaceWith(nodes: Node[]) {
		const parent = this.#parent;

		if (!parent) {
			return;
		}

		nodes.forEach((node) => {
			node.#parent?.removeChild(node);
			node.#parent = parent;
		});

		const i = parent.#children.indexOf(this);
		parent.#children = [
			...parent.#children.slice(0, i),
			...nodes,
			...parent.#children.slice(i + 1)
		];

		this.#parent = undefined;
	}
}

export const createNode = (
	type: NodeType,
	isHidden = false,
	token = '',
	id?: string
) => new Node(type, isHidden, token, id);

// A declared pair, on the nodes themselves rather than their names,
// so that it follows them through renames and moves.
export type NodePair = ResolvedPair<Node>;

// All nodes, hidden ones included, in tree order.
export const collectNodes = (node: Node): Node[] => [
	node,
	...node.children.flatMap(collectNodes)
];

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
