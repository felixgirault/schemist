import {evaluate} from '#lib/core/evaluate.js';
import type {NodeData} from '#lib/core/nodes.js';
import {
	expandRules,
	resolvePairs,
	resolveRoles
} from '#lib/core/pairs.js';
import {validateTree} from '#lib/core/tree.js';

// Parses and validates a tree given as JSON text.
export const parseTreeJson = (json: string): NodeData => {
	let data: unknown;

	try {
		data = JSON.parse(json);
	} catch (error) {
		throw new Error(
			`invalid JSON: ${(error as Error).message}`
		);
	}

	const tree = validateTree(data, 'root', true);

	// strict: whatever does not resolve is an error, see `declaredPairs`
	declaredPairs(tree, evaluate(tree, true));

	return tree;
};

// The pairs a tree declares, its own and the ones its rules give,
// with their sources; `colors` are all the colors, hidden included.
export const declaredPairs = <T extends {name: string}>(
	tree: NodeData,
	colors: T[]
) => {
	const fail = (path: string, message: string) => {
		throw new Error(`root.${path}: ${message}`);
	};
	const {pairs, errors} = resolvePairs(
		tree.pairs ?? [],
		colors
	);

	if (errors.length) {
		const {index, field, message} = errors[0];

		fail(
			`pairs[${index}]${field ? `.${field}` : ''}`,
			message
		);
	}

	const {roles, errors: roleErrors} = resolveRoles(
		tree.roles ?? [],
		colors
	);

	if (roleErrors.length) {
		const {index, message} = roleErrors[0];

		fail(`roles[${index}]`, message);
	}

	const expanded = expandRules(roles, tree.rules ?? [], pairs);

	if (expanded.errors.length) {
		const {index, field, message} = expanded.errors[0];

		fail(
			`rules[${index}]${field ? `.${field}` : ''}`,
			message
		);
	}

	return expanded.pairs;
};
