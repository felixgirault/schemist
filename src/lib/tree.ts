import type {NodeData} from '#lib/core/nodes.js';
import type defs from '#lib/definitions/nodes/index.js';
import type {Node} from '#lib/stores/nodes.svelte.js';
import {createNode} from '#lib/stores/nodes.svelte.js';

export const parseTree = (preset: NodeData) => {
	const {type, isHidden, token, args, children} = preset;
	const node = createNode(type, isHidden, token);

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
	const data: NodeData = {
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
