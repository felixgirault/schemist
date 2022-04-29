import complementary from '$lib/definitions/nodes/complementary';
import negative from '$lib/definitions/nodes/negative';
import saturation from '$lib/definitions/nodes/saturation';
import type {Preset} from '$lib/presets';
import materialNeutralDark from './materialNeutralDark';
import materialTonesDark from './materialTonesDark';

export default {
	label: 'Material dark',
	description:
		'Variations inspired by Material You for dark themes',
	nodes: [
		{
			type: saturation.type,
			token: 'Primary',
			isHidden: true,
			args: {
				amount: 40
			},
			children: [
				...materialTonesDark.nodes,
				{
					type: complementary.type,
					token: 'Complementary',
					isHidden: true,
					children: materialTonesDark.nodes
				},
				{
					type: negative.type,
					token: 'Error',
					isHidden: true,
					children: materialTonesDark.nodes
				},
				...materialNeutralDark.nodes
			]
		}
	]
} as Preset;
