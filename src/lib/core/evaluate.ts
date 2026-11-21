import {schemistToRgb} from '#lib/color/conversion.js';
import {parseColor} from '#lib/color/parsing.js';
import type {RgbColor} from '#lib/color/types.js';
import type {NodeOutput, PresetNode} from '#lib/core/nodes.js';
import {defaultArgs, generateName} from '#lib/core/nodes.js';
import defs from '#lib/definitions/nodes/index.js';

export type Entry = {
	id: string;
	name: NodeOutput[1];
	color: NodeOutput[0];
	rgbColor: RgbColor;
};

const white: NodeOutput = [parseColor('#fff')[1]!, ''];

// Entries of all visible nodes, in tree order, like
// `collectOutputs`. Ids are the nodes' depth-first indexes.
export const evaluate = (tree: PresetNode): Entry[] => {
	const entries: Entry[] = [];
	let index = 0;

	const walk = (node: PresetNode, input: NodeOutput) => {
		const id = String(index++);
		const def = defs[node.type];
		const color = def.apply(input[0], {
			...defaultArgs(def),
			...node.args
		});
		const name = generateName(
			node.token ?? '',
			color,
			input[1]
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
			walk(child, [color, name])
		);
	};

	walk(tree, white);
	return entries;
};
