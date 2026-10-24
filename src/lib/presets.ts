import type defs from '#lib/definitions/nodes/index.js';
import type {Args, Node} from '#lib/stores/nodes.svelte.js';
import {createNode} from '#lib/stores/nodes.svelte.js';

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

	if (children) {
		children.forEach((childPreset) => {
			node.addChild(parseTree(childPreset));
		});
	}

	return node;
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
