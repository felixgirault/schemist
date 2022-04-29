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
import splitComplementaryCold from './splitComplementaryCold';
import splitComplementaryWarm from './splitComplementaryWarm';
import tetradCold from './tetradCold';
import tetradWarm from './tetradWarm';
import triadCold from './triadCold';
import triadWarm from './triadWarm';
import warning from './warning';

export default {
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
	[splitComplementaryCold.type]: splitComplementaryCold,
	[splitComplementaryWarm.type]: splitComplementaryWarm,
	[tetradCold.type]: tetradCold,
	[tetradWarm.type]: tetradWarm,
	[triadCold.type]: triadCold,
	[triadWarm.type]: triadWarm,
	[warning.type]: warning
};

export const defList = [
	analogous,
	complementary,
	splitComplementaryCold,
	splitComplementaryWarm,
	tetradCold,
	tetradWarm,
	triadCold,
	triadWarm,
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
];
