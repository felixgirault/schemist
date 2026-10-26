import {formatSchemistToHex} from '#lib/color/formatting.js';
import nearestColor from '#lib/color/nearest.js';
import {parseColor} from '#lib/color/parsing.js';
import type {SchemistColor} from '#lib/color/types.js';
import defs from '#lib/definitions/nodes/index.js';
import type {
	Args,
	NodeDef,
	NodeType
} from '#lib/model/definitions.js';
import {
	defaultArgs,
	isPresetDef
} from '#lib/model/definitions.js';
import {sentenceCase} from '#lib/utils/strings.js';

export type NodeData = {
	// Only set when serializing a tree, to restore it as is.
	id?: string;
	type: NodeType;
	token?: string;
	args?: Args;
	children?: NodeData[];
	isHidden?: boolean;
};

// A tree whose ids are all set, once serialized or numbered.
export type IdentifiedNodeData = Omit<
	NodeData,
	'id' | 'children'
> & {
	id: string;
	children?: IdentifiedNodeData[];
};

export type NodeOutput = [color: SchemistColor, name: string];
export type NodeOutputRecord = Record<string, NodeOutput>;

export const generateName = (
	token: string,
	color: SchemistColor,
	parentColorName?: string
) =>
	token
		? parentColorName
			? token.replace('$', parentColorName)
			: token
		: sentenceCase(nearestColor(formatSchemistToHex(color)));

// A preset is named after its parent unless it has a token, so
// that `$` in the tokens of its colors still makes sense.
export const applyDef = (
	def: NodeDef,
	args: Args,
	token: string,
	[color, name]: NodeOutput
): NodeOutput => {
	const output = def.apply(color, args);

	return [
		output,
		isPresetDef(def) && !token
			? name
			: generateName(token, output, name)
	];
};

// Gives ids to template nodes, depth-first, so that generated
// colors keep them once expanded.
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

// Outputs of all visible nodes of a tree, in tree order, with
// presets replaced by their colors.
export const evaluateTree = (
	nodes: IdentifiedNodeData[],
	input: NodeOutput,
	outputs: NodeOutputRecord = {}
) => {
	nodes.forEach(
		({id, type, token = '', args, isHidden, children}) => {
			const def = defs[type];
			const nodeArgs = {...defaultArgs(def), ...args};
			const output = applyDef(def, nodeArgs, token, input);

			if (isPresetDef(def)) {
				if (!isHidden) {
					evaluateTree(
						withIds(def.build(nodeArgs), id),
						output,
						outputs
					);
				}

				return;
			}

			if (!isHidden) {
				outputs[id] = output;
			}

			if (children) {
				evaluateTree(children, output, outputs);
			}
		}
	);

	return outputs;
};

// Input of the root.
export const defaultInput: NodeOutput = [
	parseColor('#fff')[1]!,
	''
];

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

		for (const name of Object.keys(node.args ?? {})) {
			if (
				JSON.stringify(old.args?.[name]) !==
				JSON.stringify(node.args?.[name])
			) {
				if (changed) {
					return;
				}

				changed = `${id}.${name}`;
			}
		}
	}

	return changed;
};
