import {parseColor} from '#lib/color/parsing.js';
import type {SchemistColor} from '#lib/color/types.js';
import type {
	IdentifiedNodeData,
	NodeData,
	NodeDef,
	Overrides,
	Param,
	ParamValue,
	PresetPair,
	Role,
	Rule
} from '#lib/core/nodes.js';
import {defaultArgs, isPresetDef} from '#lib/core/nodes.js';
import {
	hasTarget,
	ruleTargets,
	targetNames,
	uses
} from '#lib/core/pairs.js';
import defs, {isNodeType} from '#lib/definitions/index.js';

const isObject = (
	value: unknown
): value is Record<string, unknown> =>
	typeof value === 'object' &&
	value !== null &&
	!Array.isArray(value);

// Conversions overshoot by float noise (pure green has
// s = 100.0000013), so bounds are checked with some tolerance.
const Tolerance = 0.001;

const within = (value: unknown, max: number) =>
	typeof value === 'number' &&
	value >= -Tolerance &&
	value <= max + Tolerance;

// The ranges of SPEC §4.1, as links and storage can hold anything.
const isColor = (value: unknown): value is SchemistColor =>
	isObject(value) &&
	within(value.h, 360) &&
	within(value.s, 100) &&
	within(value.l, 100);

const nodeKeys = [
	'type',
	'token',
	'args',
	'overrides',
	'children',
	'isHidden'
];

const rootKeys = ['pairs', 'roles', 'rules', 'variants'];

const pairKeys = ['fg', 'bg', ...targetNames];

const validatePairs = (value: unknown, path: string) => {
	if (!Array.isArray(value)) {
		throw new Error(`${path}: expected an array`);
	}

	return value.map((pair, i): PresetPair => {
		const at = `${path}[${i}]`;

		if (!isObject(pair)) {
			throw new Error(`${at}: expected an object`);
		}

		for (const [key, v] of Object.entries(pair)) {
			if (!pairKeys.includes(key)) {
				throw new Error(`${at}: unknown key "${key}"`);
			}

			if (key === 'fg' || key === 'bg') {
				if (typeof v !== 'string') {
					throw new Error(
						`${at}.${key}: expected a string`
					);
				}
			} else if (
				typeof v !== 'number' ||
				!Number.isFinite(v)
			) {
				throw new Error(`${at}.${key}: expected a number`);
			}
		}

		return pair as PresetPair;
	});
};

const isStrings = (value: unknown): value is string[] =>
	Array.isArray(value) &&
	value.every((item) => typeof item === 'string');

const validateRoles = (value: unknown, path: string) => {
	if (!Array.isArray(value)) {
		throw new Error(`${path}: expected an array`);
	}

	return value.map((role, i): Role => {
		const at = `${path}[${i}]`;

		if (!isObject(role)) {
			throw new Error(`${at}: expected an object`);
		}

		for (const key of Object.keys(role)) {
			if (key !== 'name' && key !== 'colors') {
				throw new Error(`${at}: unknown key "${key}"`);
			}
		}

		if (typeof role.name !== 'string' || !role.name) {
			throw new Error(`${at}.name: expected a name`);
		}

		if (!isStrings(role.colors)) {
			throw new Error(`${at}.colors: expected color names`);
		}

		return {name: role.name, colors: role.colors};
	});
};

const ruleKeys = ['fg', 'bg', 'use', ...targetNames];

const validateRules = (value: unknown, path: string) => {
	if (!Array.isArray(value)) {
		throw new Error(`${path}: expected an array`);
	}

	return value.map((rule, i): Rule => {
		const at = `${path}[${i}]`;

		if (!isObject(rule)) {
			throw new Error(`${at}: expected an object`);
		}

		for (const [key, v] of Object.entries(rule)) {
			if (!ruleKeys.includes(key)) {
				throw new Error(`${at}: unknown key "${key}"`);
			}

			if (key === 'fg' || key === 'bg' || key === 'use') {
				if (typeof v !== 'string') {
					throw new Error(
						`${at}.${key}: expected a string`
					);
				}
			} else if (
				typeof v !== 'number' ||
				!Number.isFinite(v)
			) {
				throw new Error(`${at}.${key}: expected a number`);
			}
		}

		if (typeof rule.fg !== 'string') {
			throw new Error(`${at}.fg: expected a role name`);
		}

		if (rule.bg === '' || rule.fg === '') {
			throw new Error(`${at}: expected a role name`);
		}

		if (
			rule.use !== undefined &&
			!uses.some(({id}) => id === rule.use)
		) {
			throw new Error(
				`${at}.use: expected ${uses.map(({id}) => id).join(', ')}`
			);
		}

		if (!hasTarget(ruleTargets(rule as Rule))) {
			throw new Error(
				`${at}: expected a use or at least one target: wcag2, apca or difference`
			);
		}

		return rule as Rule;
	});
};

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
			// Colors that are not strings come from permalinks.
			if (isColor(value)) {
				return {h: value.h, s: value.s, l: value.l};
			}

			if (isObject(value)) {
				throw new Error(
					`${path}: expected h within 0–360, s and l within 0–100`
				);
			}

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

const validateVariants = (value: unknown, path: string) => {
	if (
		!isStrings(value) ||
		!value.length ||
		value.some((name) => !name)
	) {
		throw new Error(`${path}: expected variant names`);
	}

	if (new Set(value).size !== value.length) {
		throw new Error(`${path}: a variant is named twice`);
	}

	return value;
};

// The args a variant sets, each of a param of the type, in bounds
// and not structural.
const validateOverrides = (
	value: unknown,
	path: string,
	def: NodeDef,
	variants: string[]
) => {
	if (!isObject(value)) {
		throw new Error(`${path}: expected an object`);
	}

	const result: Overrides = {};

	for (const [variant, args] of Object.entries(value)) {
		const at = `${path}.${variant}`;

		if (!variants.includes(variant)) {
			throw new Error(
				`${at}: variant not declared in root.variants`
			);
		}

		if (variant === variants[0]) {
			throw new Error(
				`${at}: the base variant has no overrides, set its args`
			);
		}

		if (!isObject(args)) {
			throw new Error(`${at}: expected an object`);
		}

		result[variant] = validateArgs(at, def, args, true);
	}

	return result;
};

// Args of a node's type, only the given ones. Overrides can't set
// structural params.
const validateArgs = (
	path: string,
	def: NodeDef,
	args: Record<string, unknown>,
	isOverride = false
) =>
	Object.fromEntries(
		Object.entries(args).map(([name, value]) => {
			const param = def.params.find((p) => p.name === name);

			if (!param) {
				throw new Error(
					`${path}.${name}: unknown param for type "${def.type}"`
				);
			}

			if (isOverride && param.isStructural) {
				throw new Error(
					`${path}.${name}: "${param.label}" changes the structure of "${def.type}", it can't differ by variant`
				);
			}

			return [
				name,
				validateArg(`${path}.${name}`, param, value)
			];
		})
	);

// Checks data that comes from outside (a file, a permalink) and
// builds a tree from it. Color params are CSS strings, converted to
// color objects. `variants` are the root's, which overrides refer to.
export const validateTree = (
	node: unknown,
	path: string,
	isRoot = false,
	variants: string[] = []
): NodeData => {
	if (!isObject(node)) {
		throw new Error(`${path}: expected an object`);
	}

	for (const key of Object.keys(node)) {
		if (
			!nodeKeys.includes(key) &&
			!(isRoot && rootKeys.includes(key))
		) {
			throw new Error(`${path}: unknown key "${key}"`);
		}
	}

	const {
		type,
		token,
		args,
		overrides,
		children,
		isHidden,
		pairs,
		roles,
		rules,
		variants: declared
	} = node;

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
		result.args = {
			...defaultArgs(def),
			...validateArgs(`${path}.args`, def, args)
		};
	}

	if (declared !== undefined) {
		result.variants = variants = validateVariants(
			declared,
			`${path}.variants`
		);
	}

	if (overrides !== undefined) {
		result.overrides = validateOverrides(
			overrides,
			`${path}.overrides`,
			def,
			variants
		);
	}

	if (children !== undefined) {
		if (!Array.isArray(children)) {
			throw new Error(`${path}.children: expected an array`);
		}

		if (children.length && isPresetDef(def)) {
			throw new Error(
				`${path}.children: a preset ("${type}") can't have children`
			);
		}

		result.children = children.map((child, i) =>
			validateTree(
				child,
				`${path}.children[${i}]`,
				false,
				variants
			)
		);
	}

	if (pairs !== undefined) {
		result.pairs = validatePairs(pairs, `${path}.pairs`);
	}

	if (roles !== undefined) {
		result.roles = validateRoles(roles, `${path}.roles`);
	}

	if (rules !== undefined) {
		result.rules = validateRules(rules, `${path}.rules`);
	}

	return result;
};

// Gives ids to template nodes, depth-first, so that generated
// colors keep them once expanded (see `evaluateNodes`).
export const withIds = (
	nodes: NodeData[],
	prefix: string,
	counter = {next: 0}
): IdentifiedNodeData[] =>
	nodes.map(({children, ...node}) => ({
		...node,
		id: `${prefix}.${counter.next++}`,
		...(children && {
			children: withIds(children, prefix, counter)
		})
	}));

const sameValue = (a: unknown, b: unknown) =>
	JSON.stringify(a) === JSON.stringify(b);

// Gives each node built for the base its overrides: the args that
// differ in what each variant builds (`byVariant`, the same
// structure as `nodes`, as structural params can't be overridden).
export const withOverrides = (
	nodes: IdentifiedNodeData[],
	byVariant: Record<string, NodeData[]>
): IdentifiedNodeData[] =>
	nodes.map((node, i) => {
		const overrides: Overrides = {};

		for (const [variant, built] of Object.entries(byVariant)) {
			const differing = Object.entries(
				built[i].args ?? {}
			).filter(
				([name, value]) =>
					!sameValue(value, node.args?.[name])
			);

			if (differing.length) {
				overrides[variant] = Object.fromEntries(differing);
			}
		}

		return {
			...node,
			...(Object.keys(overrides).length && {overrides}),
			...(node.children && {
				children: withOverrides(
					node.children,
					Object.fromEntries(
						Object.entries(byVariant).map(([v, built]) => [
							v,
							built[i].children ?? []
						])
					)
				)
			})
		};
	});

// Hides a whole tree, e.g. to keep a hidden preset hidden once
// expanded.
export const hideTree = (tree: NodeData): NodeData => ({
	...tree,
	isHidden: true,
	children: tree.children?.map(hideTree)
});

const flattenTree = (
	tree: IdentifiedNodeData,
	nodes = new Map<string, IdentifiedNodeData>()
) => {
	nodes.set(tree.id, tree);
	tree.children?.forEach((child) => flattenTree(child, nodes));
	return nodes;
};

const childIds = ({children}: IdentifiedNodeData) =>
	children?.map(({id}) => id).join() ?? '';

// Names the only arg that differs between two serialized trees
// (as `nodeId.argName`), or nothing if anything else changed.
export const changedArg = (
	previous: IdentifiedNodeData,
	next: IdentifiedNodeData
) => {
	const before = flattenTree(previous);
	const after = flattenTree(next);
	let changed: string | undefined;

	if (before.size !== after.size) {
		return;
	}

	for (const [id, node] of after) {
		const old = before.get(id);

		if (
			!old ||
			old.type !== node.type ||
			old.token !== node.token ||
			old.isHidden !== node.isHidden ||
			childIds(old) !== childIds(node)
		) {
			return;
		}

		// An override is an arg of its variant, added or removed as
		// well as changed.
		const argsOf = ({
			args,
			overrides
		}: IdentifiedNodeData) => ({
			...args,
			...Object.fromEntries(
				Object.entries(overrides ?? {}).flatMap(
					([variant, values]) =>
						Object.entries(values).map(([name, value]) => [
							`${variant}.${name}`,
							value
						])
				)
			)
		});
		const oldArgs = argsOf(old);
		const newArgs = argsOf(node);

		for (const name of new Set([
			...Object.keys(oldArgs),
			...Object.keys(newArgs)
		])) {
			if (!sameValue(oldArgs[name], newArgs[name])) {
				if (changed) {
					return;
				}

				changed = `${id}.${name}`;
			}
		}
	}

	return changed;
};
