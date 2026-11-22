import type {
	AppRole,
	AppRule,
	IdentifiedNodeData,
	NodeData,
	PresetPair,
	Role,
	Rule
} from '#lib/core/nodes.js';
import {isPresetDef} from '#lib/core/nodes.js';
import {resolvePairs, resolveRoles} from '#lib/core/pairs.js';
import {hideTree, withIds} from '#lib/core/tree.js';
import type {ColorPair, Node} from '#lib/stores/nodes.svelte.js';
import {
	collectColors,
	createNode
} from '#lib/stores/nodes.svelte.js';
import {uid} from '#lib/utils/generators.js';

const colorsOf = (root: Node) => collectColors(root);

// The names of the pairs resolved on the tree: the only place
// where the app goes from names to color ids. A pair that does not
// resolve (a bad permalink) is dropped and logged, the rest of the
// palette is kept.
export const parsePairs = (
	data: NodeData,
	root: Node
): ColorPair[] => {
	const {pairs, errors} = resolvePairs(
		data.pairs ?? [],
		colorsOf(root)
	);

	errors.forEach(({index, field, message}) =>
		console.error(
			`Dropped pair ${index}${field ? `.${field}` : ''}: ${message}`
		)
	);

	return pairs.map(({fg, bg, ...targets}) => ({
		fg: fg.id,
		bg: bg.id,
		...targets
	}));
};

// The roles of a tree on the ids of its colors, with ids of their
// own; what does not resolve is dropped and logged, as for pairs.
export const parseRoles = (
	data: NodeData,
	root: Node
): AppRole[] => {
	const {roles, errors} = resolveRoles(
		data.roles ?? [],
		colorsOf(root)
	);

	errors.forEach(({index, message}) =>
		console.error(`Dropped from role ${index}: ${message}`)
	);

	return roles.map(({name, colors}) => ({
		id: `r${uid()}`,
		name,
		colors: colors.map(({id}) => id)
	}));
};

// The rules of a tree on the ids of `roles`, with ids of their own.
// A rule of an unknown role is dropped and logged.
export const parseRules = (
	data: NodeData,
	roles: AppRole[]
): AppRule[] => {
	const idOf = (name?: string) =>
		roles.find((role) => role.name === name)?.id;

	return (data.rules ?? []).flatMap((rule, index) => {
		const fg = idOf(rule.fg);
		const bg =
			rule.bg === undefined ? undefined : idOf(rule.bg);

		if (!fg || (rule.bg !== undefined && !bg)) {
			console.error(`Dropped rule ${index}: unknown role`);
			return [];
		}

		return [{...rule, id: `u${uid()}`, fg, bg}];
	});
};

// The roles by names, as saved. A member whose name does not
// point to a single color is left out until a color is renamed,
// and listed in `unsaved` (by name), like an unsaved pair.
export const nameRoles = (root: Node, roles: AppRole[]) => {
	const colors = colorsOf(root);
	const nameOf = (id: string) =>
		colors.find((color) => color.id === id)?.name ?? id;
	const named = roles.map(({name, colors}) => ({
		name,
		colors: colors.map(nameOf)
	}));
	const shared = (name: string) =>
		colors.filter((color) => color.name === name).length > 1;

	return {
		saved: resolveRoles(named, colors).roles.map(
			({name, colors}): Role => ({
				name,
				colors: colors.map((color) => color.name)
			})
		),
		unsaved: [
			...new Set(
				named.flatMap(({colors}) => colors).filter(shared)
			)
		]
	};
};

// The rules by names, as saved. A rule of a deleted role is left out.
export const nameRules = (
	roles: AppRole[],
	rules: AppRule[]
): Rule[] => {
	const nameOf = (id?: string) =>
		roles.find((role) => role.id === id)?.name;

	return rules.flatMap(({id, fg, bg, ...rule}) => {
		const from = nameOf(fg);
		const to = bg === undefined ? undefined : nameOf(bg);

		return from && (bg === undefined || to)
			? [{...rule, fg: from, bg: to}]
			: [];
	});
};

// The pairs by names, as saved, and the ones that cannot be saved
// because a name does not point to a single color, with the names
// to change. Resolving the names is what keeps a saved pair on its
// two colors.
export const namePairs = (root: Node, pairs: ColorPair[]) => {
	const colors = colorsOf(root);
	const nameOf = (id: string) =>
		colors.find((color) => color.id === id)?.name ?? id;
	const named = pairs.map(
		({fg, bg, ...targets}): PresetPair => ({
			...targets,
			fg: nameOf(fg),
			bg: nameOf(bg)
		})
	);
	const {pairs: resolved, errors} = resolvePairs(named, colors);

	return {
		saved: resolved.map(
			({fg, bg, ...targets}): PresetPair => ({
				...targets,
				fg: fg.name,
				bg: bg.name
			})
		),
		unsaved: [...new Set(errors.map(({index}) => index))].map(
			(index) => ({
				pair: pairs[index],
				names: [
					...new Set(
						errors
							.filter((e) => e.index === index && e.field)
							.map((e) => named[index][e.field!])
					)
				]
			})
		)
	};
};

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

// `pairs`, `roles` and `rules` are the root's: pairs and roles are
// saved by names.
export const serializeTree = (
	node: Node,
	pairs?: ColorPair[],
	roles?: AppRole[],
	rules?: AppRule[]
) => {
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
		data.children = children.map((child) =>
			serializeTree(child)
		);
	}

	if (pairs?.length) {
		const {saved} = namePairs(node, pairs);

		if (saved.length) {
			data.pairs = saved;
		}
	}

	if (roles?.length) {
		data.roles = nameRoles(node, roles).saved;
	}

	if (roles && rules?.length) {
		data.rules = nameRules(roles, rules);
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

// The pairs of a snapshot on the colors of a tree parsed from it.
// Pairs of unknown colors are dropped.
export const pairsOn = (
	root: Node,
	pairs: PresetPair[]
): ColorPair[] => {
	const ids = new Set(colorsOf(root).map(({id}) => id));

	return pairs.filter(({fg, bg}) => ids.has(fg) && ids.has(bg));
};

// The roles of a snapshot on the colors of a tree parsed from it.
// Members that are not colors of the tree are dropped, roles stay.
export const rolesOn = (
	root: Node,
	roles: AppRole[]
): AppRole[] => {
	const ids = new Set(colorsOf(root).map(({id}) => id));

	return roles.map((role) => ({
		...role,
		colors: role.colors.filter((id) => ids.has(id))
	}));
};
