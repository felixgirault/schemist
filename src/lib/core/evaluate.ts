import {schemistToRgb} from '#lib/color/conversion.js';
import type {RgbColor, SchemistColor} from '#lib/color/types.js';
import type {NodeData, NodeOutput} from '#lib/core/nodes.js';
import {
	applyDef,
	defaultArgs,
	defaultInput,
	isPresetDef
} from '#lib/core/nodes.js';
import defs from '#lib/definitions/index.js';

export type PaletteColor = {
	id: string;
	name: string;
	color: SchemistColor;
	rgbColor: RgbColor;
};

export type EvaluatedColor = NodeOutput & {id: string};

// Colors of the visible nodes, in tree order, with presets
// replaced by the colors they generate. Ids are the nodes'
// depth-first indexes after `prefix`, and those of generated
// colors follow their preset's id: `<preset id>.<index>`, see
// ADR 7. Hidden nodes are left out unless `withHidden`.
export const evaluateNodes = (
	nodes: NodeData[],
	input: NodeOutput,
	prefix = '',
	counter = {next: 0},
	colors: EvaluatedColor[] = [],
	withHidden = false,
	variant?: string
) => {
	nodes.forEach(
		({type, token, args, overrides, isHidden, children}) => {
			const id = `${prefix}${counter.next++}`;
			const def = defs[type];
			const nodeArgs = {
				...defaultArgs(def),
				...args,
				...(variant && overrides?.[variant])
			};
			const output = applyDef(
				def,
				nodeArgs,
				token ?? '',
				input
			);

			if (isPresetDef(def)) {
				if (withHidden || !isHidden) {
					evaluateNodes(
						def.build(nodeArgs),
						output,
						`${id}.`,
						undefined,
						colors,
						withHidden,
						variant
					);
				}

				return;
			}

			if (withHidden || !isHidden) {
				colors.push({id, ...output});
			}

			if (children) {
				evaluateNodes(
					children,
					output,
					prefix,
					counter,
					colors,
					withHidden,
					variant
				);
			}
		}
	);

	return colors;
};

export const toPaletteColors = (colors: EvaluatedColor[]) =>
	colors.map((color): PaletteColor => ({
		...color,
		rgbColor: schemistToRgb(color.color)
	}));

// Colors of all visible nodes, in tree order, like
// `collectOutputs`, or of all nodes with `withHidden`. With a
// `variant` (a name of the tree's `variants`), its overrides apply;
// without, the base is evaluated.
export const evaluate = (
	tree: NodeData,
	withHidden = false,
	variant?: string
) =>
	toPaletteColors(
		evaluateNodes(
			[tree],
			defaultInput,
			'',
			undefined,
			undefined,
			withHidden,
			variant
		)
	);
