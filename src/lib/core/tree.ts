import {parseColor} from '#lib/color/parsing.js';
import type {
	NodeData,
	Param,
	ParamValue
} from '#lib/core/nodes.js';
import {defaultArgs} from '#lib/core/nodes.js';
import defs, {isNodeType} from '#lib/definitions/nodes/index.js';

const isObject = (
	value: unknown
): value is Record<string, unknown> =>
	typeof value === 'object' &&
	value !== null &&
	!Array.isArray(value);

const nodeKeys = [
	'type',
	'token',
	'args',
	'children',
	'isHidden'
];

const validateArg = (
	path: string,
	param: Param,
	value: unknown
): ParamValue => {
	switch (param.type) {
		case 'range':
			if (
				!Number.isInteger(value) ||
				(value as number) < param.min ||
				(value as number) > param.max
			) {
				throw new Error(
					`${path}: expected an integer between ${param.min} and ${param.max}`
				);
			}
			return value as number;
		case 'boolean':
			if (typeof value !== 'boolean') {
				throw new Error(`${path}: expected a boolean`);
			}
			return value as boolean;
		case 'color': {
			const [, color] =
				typeof value === 'string' ? parseColor(value) : [];

			if (!color) {
				throw new Error(
					`${path}: expected a CSS color string (hex, rgb, hsl or lch)`
				);
			}
			return color;
		}
	}
};

// Checks data that comes from outside (a file, a permalink) and
// builds a tree from it. Color params are CSS strings, converted to
// color objects.
export const validateTree = (
	node: unknown,
	path: string
): NodeData => {
	if (!isObject(node)) {
		throw new Error(`${path}: expected an object`);
	}

	for (const key of Object.keys(node)) {
		if (!nodeKeys.includes(key)) {
			throw new Error(`${path}: unknown key "${key}"`);
		}
	}

	const {type, token, args, children, isHidden} = node;

	if (typeof type !== 'string' || !isNodeType(type)) {
		throw new Error(
			`${path}.type: unknown node type ${JSON.stringify(type)}`
		);
	}

	const def = defs[type];
	const result: NodeData = {type};

	if (token !== undefined) {
		if (typeof token !== 'string') {
			throw new Error(`${path}.token: expected a string`);
		}
		result.token = token;
	}

	if (isHidden !== undefined) {
		if (typeof isHidden !== 'boolean') {
			throw new Error(`${path}.isHidden: expected a boolean`);
		}
		result.isHidden = isHidden;
	}

	if (args !== undefined) {
		if (!isObject(args)) {
			throw new Error(`${path}.args: expected an object`);
		}

		// packing needs every param, not only the given ones
		result.args = {...defaultArgs(def)};

		for (const [name, value] of Object.entries(args)) {
			const param = def.params.find((p) => p.name === name);

			if (!param) {
				throw new Error(
					`${path}.args.${name}: unknown param for type "${type}"`
				);
			}

			result.args[name] = validateArg(
				`${path}.args.${name}`,
				param,
				value
			);
		}
	}

	if (children !== undefined) {
		if (!Array.isArray(children)) {
			throw new Error(`${path}.children: expected an array`);
		}

		result.children = children.map((child, i) =>
			validateTree(child, `${path}.children[${i}]`)
		);
	}

	return result;
};
