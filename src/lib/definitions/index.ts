import type {NodeDef, NodeType} from '#lib/core/nodes.js';
import {colorDefs} from '#lib/definitions/nodes/index.js';
import {presetDefs} from '#lib/definitions/presets/index.js';

// Every node type, presets included, by type code.
const defs: {[T in NodeType]: NodeDef} = {
	...colorDefs,
	...presetDefs
};

export const isNodeType = (type: string): type is NodeType =>
	Object.hasOwn(defs, type);

export default defs;
