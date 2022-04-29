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
	[splitComplementaryLeft.type]: splitComplementaryLeft,
	[splitComplementaryRight.type]: splitComplementaryRight,
	[tetradLeft.type]: tetradLeft,
	[tetradRight.type]: tetradRight,
	[triadLeft.type]: triadLeft,
	[triadRight.type]: triadRight,
	[warning.type]: warning
};

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
];
