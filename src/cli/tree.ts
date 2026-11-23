import {evaluate} from '#lib/core/evaluate.js';
import type {Requirements} from '#lib/core/export.js';
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

// The variants to check: each one of the tree's, or just the base
// (`undefined`) for a tree without.
export const variantsOf = (tree: NodeData) =>
	tree.variants ?? [undefined];

// The colors of a variant, named as in the base, so that one name
// is one color in every variant, whatever its color is called there.
export const inVariant = (
	tree: NodeData,
	variant?: string,
	withHidden = false
) => {
	const names = new Map(
		evaluate(tree, true).map(({id, name}) => [id, name])
	);

	return evaluate(tree, withHidden, variant).map((color) => ({
		...color,
		name: names.get(color.id) ?? color.name
	}));
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

// The pairs and roles of a tree, as the exports take them: by color
// id, hidden colors being left out there.
export const exportRequirements = (
	tree: NodeData
): Requirements => {
	const colors = evaluate(tree, true);

	return {
		pairs: declaredPairs(tree, colors).map(
			({fg, bg, sources, ...targets}) => ({
				...targets,
				fg: fg.id,
				bg: bg.id
			})
		),
		roles: resolveRoles(tree.roles ?? [], colors).roles.map(
			({name, colors}) => ({
				name,
				colors: colors.map(({id}) => id)
			})
		)
	};
};
