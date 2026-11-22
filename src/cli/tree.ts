import {evaluate} from '#lib/core/evaluate.js';
import type {NodeData} from '#lib/core/nodes.js';
import {resolvePairs} from '#lib/core/pairs.js';
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

	if (tree.pairs) {
		const {errors} = resolvePairs(
			tree.pairs,
			evaluate(tree, true)
		);

		if (errors.length) {
			const {index, field, message} = errors[0];

			throw new Error(
				`root.pairs[${index}]${field ? `.${field}` : ''}: ${message}`
			);
		}
	}

	return tree;
};
