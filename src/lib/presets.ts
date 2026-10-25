import type defs from '#lib/definitions/nodes/index.js';
import type {Args, Node} from '#lib/stores/nodes.svelte.js';
import {
	createNode,
	isGroupDef,
	withIds
} from '#lib/stores/nodes.svelte.js';

export type PresetNode = {
	// Only set when serializing a tree, to restore it as is.
	id?: string;
	type: keyof typeof defs;
	token?: string;
	args?: Args;
	children?: PresetNode[];
	isHidden?: boolean;
};

export type Preset = {
	label: string;
	description?: string;
	nodes: PresetNode[];
};

export const parseTree = (preset: PresetNode) => {
	const {id, type, isHidden, token, args, children} = preset;
	const node = createNode(type, isHidden, token, id);

	if (args) {
		Object.assign(node.args, args);
	}

	// Groups generate their colors, and can't have children.
	if (children && !isGroupDef(node.def)) {
		children.forEach((childPreset) => {
			node.addChild(parseTree(childPreset));
		});
	}

	return node;
};

const hideTree = (tree: PresetNode): PresetNode => ({
	...tree,
	isHidden: true,
	children: tree.children?.map(hideTree)
});

// Replaces a group with the plain nodes it builds, in a single
// change. They keep the ids of the colors they generated, see
// ADR 4.
export const ungroup = (group: Node) => {
	const {def, args, token, isHidden} = group;

	if (!group.parent || !isGroupDef(def)) {
		return;
	}

	const trees = withIds(def.build(args), group.id).map(
		(tree) => {
			// `$` referred to the group, which is going away.
			const named =
				token && tree.token
					? {...tree, token: tree.token.replace('$', token)}
					: tree;

			return isHidden ? hideTree(named) : named;
		}
	);

	group.replaceWith(trees.map(parseTree));
};

export const serializeTree = (node: Node) => {
	const {token, args, children} = node;
	const data: PresetNode = {
		id: node.id,
		type: node.def.type as keyof typeof defs,
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
	tree: PresetNode,
	nodes = new Map<string | undefined, PresetNode>()
) => {
	nodes.set(tree.id, tree);
	tree.children?.forEach((child) => flattenTree(child, nodes));
	return nodes;
};

const childIds = ({children}: PresetNode) =>
	children?.map(({id}) => id).join() ?? '';

// Names the only arg that differs between two serialized trees
// (as `nodeId.argName`), or nothing if anything else changed.
export const changedArg = (
	previous: PresetNode,
	next: PresetNode
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
