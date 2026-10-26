import type {
	PresetDef,
	PresetType
} from '#lib/stores/nodes.svelte.js';
import harmonies from './harmonies';
import materialDark from './materialDark';
import materialLight from './materialLight';
import materialNeutralDark from './materialNeutralDark';
import materialNeutralLight from './materialNeutralLight';
import materialTonesDark from './materialTonesDark';
import materialTonesLight from './materialTonesLight';
import neutral from './neutral';
import rainbow from './rainbow';
import scale from './scale';
import schemist from './schemist';
import semanticPairs from './semanticPairs';
import semantics from './semantics';
import splitComplementary from './splitComplementary';
import states from './states';
import tetrad from './tetrad';
import triad from './triad';

// In display order.
export const presetDefs: {
	[T in PresetType]: PresetDef & {type: T};
} = {
	[states.type]: states,
	[splitComplementary.type]: splitComplementary,
	[triad.type]: triad,
	[tetrad.type]: tetrad,
	[semantics.type]: semantics,
	[semanticPairs.type]: semanticPairs,
	[scale.type]: scale,
	[neutral.type]: neutral,
	[harmonies.type]: harmonies,
	[rainbow.type]: rainbow,
	[materialTonesLight.type]: materialTonesLight,
	[materialTonesDark.type]: materialTonesDark,
	[materialNeutralLight.type]: materialNeutralLight,
	[materialNeutralDark.type]: materialNeutralDark,
	[materialLight.type]: materialLight,
	[materialDark.type]: materialDark,
	[schemist.type]: schemist
};

export default Object.values(presetDefs);
