import {get} from 'svelte/store';
import type defs from '$lib/definitions/nodes';
import type {Args, Node, NodeDef} from '$lib/stores/nodes';
import {createNode} from '$lib/stores/nodes';

export type PresetNode = {
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
	const {type, isHidden, token, args, children} = preset;
	const node = createNode(type, isHidden, token);

	if (args) {
		node.args.update((current) => ({
			...current,
			...args
		}));
	}

	if (children) {
		children.forEach((childPreset) => {
			node.addChild(parseTree(childPreset));
		});
	}

	return node;
};

export const serializeTree = (node: Node) => {
	const token = get(node.token);
	const args = get(node.args);
	const children = get(node.children);
	const data: PresetNode = {
		type: node.def.type as keyof typeof defs,
		isHidden: get(node.isHidden)
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
