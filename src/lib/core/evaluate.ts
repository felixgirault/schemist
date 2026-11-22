import {schemistToRgb} from '#lib/color/conversion.js';
import {parseColor} from '#lib/color/parsing.js';
import type {RgbColor, SchemistColor} from '#lib/color/types.js';
import type {NodeOutput, NodeData} from '#lib/core/nodes.js';
import {defaultArgs, generateName} from '#lib/core/nodes.js';
import defs from '#lib/definitions/nodes/index.js';

export type PaletteColor = {
	id: string;
	name: string;
	color: SchemistColor;
	rgbColor: RgbColor;
};

const white: NodeOutput = {
	color: parseColor('#fff')[1]!,
	name: ''
};

// Entries of all visible nodes, in tree order, like
// `collectOutputs`. Ids are the nodes' depth-first indexes.
export const evaluate = (tree: NodeData): PaletteColor[] => {
	const entries: PaletteColor[] = [];
	let index = 0;

	const walk = (node: NodeData, input: NodeOutput) => {
		const id = String(index++);
		const def = defs[node.type];
		const color = def.apply(input.color, {
			...defaultArgs(def),
			...node.args
		});
		const name = generateName(
			node.token ?? '',
			color,
			input.name
		);

		if (!node.isHidden) {
			entries.push({
				id,
				name,
				color,
				rgbColor: schemistToRgb(color)
			});
		}

		node.children?.forEach((child) =>
			walk(child, {color, name})
		);
	};

	walk(tree, white);
	return entries;
};
