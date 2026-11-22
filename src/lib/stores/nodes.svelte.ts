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
	isPresetDef
} from '#lib/core/nodes.js';
import defs from '#lib/definitions/index.js';
import {withoutIndex} from '#lib/utils/arrays.js';
import {uid} from '#lib/utils/generators.js';

export type NodeOutputRecord = Record<Node['id'], NodeOutput>;

export class Node {
	readonly id: string;
	readonly def: NodeDef;
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
