import {formatSchemistToHex} from '#lib/color/formatting.js';
import type {PresetNode} from '#lib/core/nodes.js';
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
const withHexColors = (node: PresetNode): PresetNode => {
	const {params} = defs[node.type];
	const result = {...node};

	if (node.args) {
		result.args = Object.fromEntries(
			Object.entries(node.args).map(([name, value]) => [
				name,
				params.find((p) => p.name === name)?.type === 'color'
					? formatSchemistToHex(value)
					: value
			])
		);
	}

	if (node.children) {
		result.children = node.children.map(withHexColors);
	}

	return result;
};

export const listPresets = () =>
	presets.map(({label, description, nodes}) => ({
		label,
		description,
		nodes: nodes.map(withHexColors)
	}));
