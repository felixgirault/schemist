import {parseColor} from '#lib/color/parsing.js';
import type {
	Args,
	NodeDef,
	NodeOutput,
	NodeType
} from '#lib/core/nodes.js';
import {defaultArgs, generateName} from '#lib/core/nodes.js';
import defs from '#lib/definitions/nodes/index.js';
import {withoutIndex} from '#lib/utils/arrays.js';
import {uid} from '#lib/utils/generators.js';

export type NodeOutputRecord = Record<Node['id'], NodeOutput>;

const defaultInput: NodeOutput = {
	color: parseColor('#fff')[1]!,
	name: ''
};

export class Node {
	readonly id = `n${uid()}`;
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
	output: NodeOutput = $derived.by(() => {
		const color = this.def.apply(this.input.color, this.args);
		const name = generateName(
			this.token,
			color,
			this.input.name
		);
		return {color, name};
	});

	constructor(type: NodeType, isHidden = false, token = '') {
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
}

export const createNode = (
	type: NodeType,
	isHidden = false,
	token = ''
) => new Node(type, isHidden, token);

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
