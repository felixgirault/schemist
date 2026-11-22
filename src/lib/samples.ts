import {evaluateNodes} from '#lib/core/evaluate.js';
import type {
	Args,
	NodeDef,
	Param,
	NodeData
} from '#lib/core/nodes.js';
import {range} from '#lib/utils/generators.js';
import {interval} from '#lib/utils/math.js';
import type {SchemistColor} from './color/types';

export const sample = (
	def: NodeDef,
	color: SchemistColor,
	ratio?: number
) =>
	def.apply(
		color,
		Object.fromEntries(
			def.params.map((param) => [
				param.name,
				ratio !== undefined && param.type === 'range'
					? interval(param.min, param.max, ratio)
					: param.default
			])
		)
	);

export const samples = (
	def: NodeDef,
	color: SchemistColor,
	count: number
) =>
	range(count).map((i) => sample(def, color, i / (count - 1)));

export const paramSample = (
	def: NodeDef,
	args: Args,
	paramName: Param['name'],
	color: SchemistColor,
	ratio: number
) =>
	def.apply(
		color,
		Object.fromEntries(
			def.params.map((param) => [
				param.name,
				param.name === paramName && param.type === 'range'
					? interval(param.min, param.max, ratio)
					: param.name in args
						? args[param.name]
						: param.default
			])
		)
	);

export const paramSamples = (
	def: NodeDef,
	args: Args,
	paramName: Param['name'],
	color: SchemistColor,
	count: number
) =>
	range(count).map((_, i) =>
		paramSample(def, args, paramName, color, i / (count - 1))
	);

// Visible colors of nodes, generated colors of presets included.
export const presetSamples = (
	nodes: NodeData[],
	color: SchemistColor
) =>
	evaluateNodes(nodes, {color, name: ''}).map(
		({color}) => color
	);
