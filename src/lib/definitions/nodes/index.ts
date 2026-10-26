import {presetDefs} from '#lib/definitions/presets/index.js';
import type {
	ColorType,
	NodeDef,
	NodeType
} from '#lib/stores/nodes.svelte.js';
import analogous from './analogous';
import color from './color';
import complementary from './complementary';
import contrasting from './contrasting';
import highlight from './highlight';
import hue from './hue';
import informative from './informative';
import lightness from './lightness';
import negative from './negative';
import positive from './positive';
import saturation from './saturation';
import shadow from './shadow';
import splitComplementaryLeft from './splitComplementaryLeft';
import splitComplementaryRight from './splitComplementaryRight';
import tetradLeft from './tetradLeft';
import tetradRight from './tetradRight';
import triadLeft from './triadLeft';
import triadRight from './triadRight';
import warning from './warning';

// Typed against the list of types, so that none is missing.
const colorDefs: {[T in ColorType]: NodeDef & {type: T}} = {
	[analogous.type]: analogous,
	[complementary.type]: complementary,
	[contrasting.type]: contrasting,
	[highlight.type]: highlight,
	[hue.type]: hue,
	[informative.type]: informative,
	[lightness.type]: lightness,
	[negative.type]: negative,
	[color.type]: color,
	[positive.type]: positive,
	[saturation.type]: saturation,
	[shadow.type]: shadow,
	[splitComplementaryLeft.type]: splitComplementaryLeft,
	[splitComplementaryRight.type]: splitComplementaryRight,
	[tetradLeft.type]: tetradLeft,
	[tetradRight.type]: tetradRight,
	[triadLeft.type]: triadLeft,
	[triadRight.type]: triadRight,
	[warning.type]: warning
};

// Presets are listed in their own module rather than in `defList`.
const defs: {[T in NodeType]: NodeDef} = {
	...colorDefs,
	...presetDefs
};

export const isNodeType = (type: string): type is NodeType =>
	Object.hasOwn(defs, type);

export default defs;

export const defList = [
	analogous,
	complementary,
	splitComplementaryLeft,
	splitComplementaryRight,
	tetradLeft,
	tetradRight,
	triadLeft,
	triadRight,
	contrasting,
	informative,
	positive,
	warning,
	negative,
	highlight,
	shadow,
	lightness,
	saturation,
	hue,
	color
] as NodeDef[];
