import type {
	IdentifiedNodeData,
	NodeData
} from '#lib/core/nodes.js';
import {isPresetDef} from '#lib/core/nodes.js';
import {hideTree, withIds} from '#lib/core/tree.js';
import type {Node} from '#lib/stores/nodes.svelte.js';
import {createNode} from '#lib/stores/nodes.svelte.js';

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

// Replaces a preset with the plain nodes it builds, in a single
// change. They keep the ids of the colors they generated, see
// ADR 7.
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
