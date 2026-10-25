import type {NodeDef} from '#lib/stores/nodes.svelte.js';
import analogous from './analogous';
import color from './color';
import complementary from './complementary';
import contrasting from './contrasting';
import harmonies from './harmonies';
import highlight from './highlight';
import hue from './hue';
import informative from './informative';
import lightness from './lightness';
import materialDark from './materialDark';
import materialLight from './materialLight';
import materialNeutralDark from './materialNeutralDark';
import materialNeutralLight from './materialNeutralLight';
import materialTonesDark from './materialTonesDark';
import materialTonesLight from './materialTonesLight';
import negative from './negative';
import neutral from './neutral';
import positive from './positive';
import rainbow from './rainbow';
import saturation from './saturation';
import scale from './scale';
import schemist from './schemist';
import semanticPairs from './semanticPairs';
import semantics from './semantics';
import shadow from './shadow';
import splitComplementary from './splitComplementary';
import splitComplementaryLeft from './splitComplementaryLeft';
import splitComplementaryRight from './splitComplementaryRight';
import states from './states';
import tetrad from './tetrad';
import tetradLeft from './tetradLeft';
import tetradRight from './tetradRight';
import triad from './triad';
import triadLeft from './triadLeft';
import triadRight from './triadRight';
import warning from './warning';

// Typed explicitly, as groups build trees of these types.
const defs: Record<string, NodeDef> = {
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
	[warning.type]: warning,
	// Groups, listed through presets rather than in `defList`.
	[harmonies.type]: harmonies,
	[materialDark.type]: materialDark,
	[materialLight.type]: materialLight,
	[materialNeutralDark.type]: materialNeutralDark,
	[materialNeutralLight.type]: materialNeutralLight,
	[materialTonesDark.type]: materialTonesDark,
	[materialTonesLight.type]: materialTonesLight,
	[neutral.type]: neutral,
	[rainbow.type]: rainbow,
	[scale.type]: scale,
	[schemist.type]: schemist,
	[semanticPairs.type]: semanticPairs,
	[semantics.type]: semantics,
	[splitComplementary.type]: splitComplementary,
	[states.type]: states,
	[tetrad.type]: tetrad,
	[triad.type]: triad
};

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
