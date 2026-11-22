import {formatSchemistToHex} from '#lib/color/formatting.js';
import type {SchemistColor} from '#lib/color/types.js';
import type {NodeData} from '#lib/core/nodes.js';
import {defList} from '#lib/definitions/nodes/index.js';
import defs from '#lib/definitions/nodes/index.js';
import presets from '#lib/definitions/presets/index.js';

export const listTypes = () =>
	defList.map(({type, label, description, params}) => ({
		type,
		label,
		description,
		params: params.map((param) => ({
			name: param.name,
			kind: param.type,
			min: 'min' in param ? param.min : undefined,
			max: 'max' in param ? param.max : undefined,
			unit: 'unit' in param ? param.unit : undefined,
			default:
				param.type === 'color'
					? formatSchemistToHex(param.default)
					: param.default
		}))
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

export const listPresets = () =>
	presets.map(({label, description, nodes}) => ({
		label,
		description,
		nodes: nodes.map(withHexColors)
	}));
