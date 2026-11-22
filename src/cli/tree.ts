import type {NodeData} from '#lib/core/nodes.js';
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

	return validateTree(data, 'root');
};
