import type {
	Args,
	Node,
	NodeType
} from '#lib/stores/nodes.svelte.js';
import {
	createNode,
	isPresetDef,
	withIds
} from '#lib/stores/nodes.svelte.js';

export type NodeData = {
	// Only set when serializing a tree, to restore it as is.
	id?: string;
	type: NodeType;
	token?: string;
	args?: Args;
	children?: NodeData[];
	isHidden?: boolean;
};

// A tree whose ids are all set, once serialized or numbered.
export type IdentifiedNodeData = Omit<
	NodeData,
	'id' | 'children'
> & {
	id: string;
	children?: IdentifiedNodeData[];
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

const hideTree = (tree: NodeData): NodeData => ({
	...tree,
	isHidden: true,
	children: tree.children?.map(hideTree)
});

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

const flattenTree = (
	tree: NodeData,
	nodes = new Map<string | undefined, NodeData>()
) => {
	nodes.set(tree.id, tree);
	tree.children?.forEach((child) => flattenTree(child, nodes));
	return nodes;
};

const childIds = ({children}: NodeData) =>
	children?.map(({id}) => id).join() ?? '';

// Names the only arg that differs between two serialized trees
// (as `nodeId.argName`), or nothing if anything else changed.
export const changedArg = (
	previous: NodeData,
	next: NodeData
) => {
	const before = flattenTree(previous);
	const after = flattenTree(next);
	let changed: string | undefined;

	if (before.size !== after.size) {
		return;
	}

	for (const [id, node] of after) {
		const old = before.get(id);

		if (
			!old ||
			old.type !== node.type ||
			old.token !== node.token ||
			old.isHidden !== node.isHidden ||
			childIds(old) !== childIds(node)
		) {
			return;
		}

		for (const name of Object.keys(node.args ?? {})) {
			if (
				JSON.stringify(old.args?.[name]) !==
				JSON.stringify(node.args?.[name])
			) {
				if (changed) {
					return;
				}

				changed = `${id}.${name}`;
			}
		}
	}

	return changed;
};
