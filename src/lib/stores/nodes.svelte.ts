import {evaluateNodes} from '#lib/core/evaluate.js';
import type {
	Args,
	NodeDef,
	NodeOutput,
	NodeType,
	Overrides,
	ParamValue
} from '#lib/core/nodes.js';
import {
	applyDef,
	defaultArgs,
	defaultInput,
	isPresetDef,
	remapArgs,
	remapOverrides
} from '#lib/core/nodes.js';
import type {ResolvedPair} from '#lib/core/pairs.js';
import defs from '#lib/definitions/index.js';
import {withoutIndex} from '#lib/utils/arrays.js';
import {uid} from '#lib/utils/generators.js';

export type NodeOutputRecord = Record<Node['id'], NodeOutput>;

// What the app shows, not what it saves: the variant whose overrides
// apply, by id, or nothing for the base (ADR 19).
export const view = $state<{variant?: string}>({});

export class Node {
	readonly id: string;
	// Raw, as definitions are never mutated, only replaced.
	def: NodeDef = $state.raw(defs.clr);
	token = $state('');
	isHidden = $state(false);
	args: Args = $state({});
	// By variant id, never the base's (ADR 19).
	overrides: Overrides = $state({});
	// The args in the selected variant.
	activeArgs: Args = $derived({
		...this.args,
		...(view.variant && this.overrides[view.variant])
	});
	// Only changed through the tree methods, which keep both ends
	// of a link in sync.
	#children: Node[] = $state([]);
	#parent?: Node = $state();
	input: NodeOutput = $derived(
		this.#parent?.output ?? defaultInput
	);
	output: NodeOutput = $derived.by(() =>
		applyDef(this.def, this.activeArgs, this.token, this.input)
	);
	// Colors of a preset, keyed by `<preset id>.<index>`.
	generated: NodeOutputRecord = $derived.by(() => {
		const {def, activeArgs: args, output, id} = this;

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

	// Sets an arg of the selected variant, or the base's.
	setArg(name: string, value: ParamValue) {
		const variant = view.variant;

		if (variant) {
			this.overrides = {
				...this.overrides,
				[variant]: {
					...this.overrides[variant],
					[name]: value
				}
			};
		} else {
			this.args[name] = value;
		}
	}

	// Whether the selected variant overrides an arg, or any.
	isOverridden(name?: string) {
		const args = view.variant && this.overrides[view.variant];

		return !!args && (name === undefined || name in args);
	}

	resetArg(name: string) {
		const variant = view.variant;

		if (variant && this.isOverridden(name)) {
			const {[name]: _, ...rest} = this.overrides[variant];
			const {[variant]: __, ...others} = this.overrides;

			this.overrides = Object.keys(rest).length
				? {...others, [variant]: rest}
				: others;
		}
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
		this.overrides = remapOverrides(
			this.def,
			def,
			this.overrides
		);
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

// A declared pair, on color ids rather than names, so that it
// follows the colors through renames and moves: a node's id, or
// `<preset id>.<index>` for a color a preset generates.
export type ColorPair = ResolvedPair<string>;

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

// Every color of the tree, hidden ones included, with presets
// replaced by their colors. A hidden node hides its own colors.
export const collectColors = (
	node: Node
): {id: string; name: string; isHidden: boolean}[] => [
	...(isPresetDef(node.def)
		? Object.entries(node.generated).map(([id, {name}]) => ({
				id,
				name,
				isHidden: node.isHidden
			}))
		: [
				{
					id: node.id,
					name: node.output.name,
					isHidden: node.isHidden
				}
			]),
	...node.children.flatMap(collectColors)
];
