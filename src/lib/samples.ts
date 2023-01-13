import defs from '$lib/definitions/nodes';
import type {PresetNode} from '$lib/presets';
import type {Args, NodeDef, Param} from '$lib/stores/nodes';
import {range} from '$lib/utils/generators';
import {interval} from '$lib/utils/math';
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

export const presetSample = (
	def: NodeDef,
	color: SchemistColor,
	args?: Args
) =>
	def.apply(
		color,
		Object.fromEntries(
			def.params.map(({name, default: d}) => [
				name,
				args && name in args ? args[name] : d
			])
		)
	);

export const presetSamples = (
	nodes: PresetNode[],
	color: SchemistColor
) =>
	nodes.flatMap(({type, args, children, isHidden}) => {
		const def = defs[type];
		const sample = presetSample(def, color, args);
		const samples: SchemistColor[] = [];

		if (!isHidden) {
			samples.push(sample);
		}

		if (children) {
			samples.push(...presetSamples(children, sample));
		}

		return samples;
	});
