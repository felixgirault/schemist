import type {
	ColorType,
	NodeDef,
	Param,
	PresetDef,
	PresetType
} from '#lib/stores/nodes.svelte.js';

// Infers args from params, and keeps the type code as is, so
// that registries can check it. This module only imports types,
// as the module of nodes loads definitions.
export const defineNode = <
	const T extends ColorType,
	const P extends readonly Param[]
>(
	def: NodeDef<P> & {type: T}
) => def;

export const definePreset = <
	const T extends PresetType,
	const P extends readonly Param[]
>(
	def: PresetDef<P> & {type: T}
) => def;
