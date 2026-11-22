import {formatSchemistToHex} from '#lib/color/formatting.js';
import type {SchemistColor} from '#lib/color/types.js';
import type {NodeData, Param} from '#lib/core/nodes.js';
import {defaultArgs} from '#lib/core/nodes.js';
import defs from '#lib/definitions/index.js';
import {defList} from '#lib/definitions/nodes/index.js';
import presets from '#lib/definitions/presets/index.js';

const listParams = (params: readonly Param[]) =>
	params.map((param) => ({
		name: param.name,
		kind: param.type,
		min: 'min' in param ? param.min : undefined,
		max: 'max' in param ? param.max : undefined,
		unit: 'unit' in param ? param.unit : undefined,
		default:
			param.type === 'color'
				? formatSchemistToHex(param.default)
				: param.default
	}));

export const listTypes = () =>
	defList.map(({type, label, description, params}) => ({
		type,
		label,
		description,
		params: listParams(params)
	}));

// Color args as hex, as the input accepts them.
type JsonNode = Omit<NodeData, 'args' | 'children'> & {
	args?: Record<string, string | number | boolean>;
	children?: JsonNode[];
};

const withHexColors = ({
	args,
	children,
	...rest
}: NodeData): JsonNode => {
	const {params} = defs[rest.type];
	const result: JsonNode = {...rest};

	if (args) {
		result.args = Object.fromEntries(
			Object.entries(args).map(([name, value]) => [
				name,
				params.find((p) => p.name === name)?.type === 'color'
					? formatSchemistToHex(value as SchemistColor)
					: (value as number | boolean)
			])
		);
	}

	if (children) {
		result.children = children.map(withHexColors);
	}

	return result;
};

// Presets are single nodes, `nodes` being what they generate with
// their default params.
export const listPresets = () =>
	presets.map(({type, label, description, params, build}) => ({
		type,
		label,
		description,
		params: listParams(params),
		nodes: build(defaultArgs(defs[type])).map(withHexColors)
	}));
