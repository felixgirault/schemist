import complementary from '$lib/definitions/nodes/complementary';
import negative from '$lib/definitions/nodes/negative';
import saturation from '$lib/definitions/nodes/saturation';
import type {Preset} from '$lib/presets';
import materialNeutralLight from './materialNeutralLight';
import materialTonesLight from './materialTonesLight';

export default {
	label: 'Material light',
	description:
		'Variations inspired by Material You for light themes',
	nodes: [
		{
			type: saturation.type,
			token: 'Primary',
			isHidden: true,
			args: {
				amount: 40
			},
			children: [
				...materialTonesLight.nodes,
				{
					type: complementary.type,
					token: 'Complementary',
					isHidden: true,
					children: materialTonesLight.nodes
				},
				{
					type: negative.type,
					token: 'Error',
					isHidden: true,
					children: materialTonesLight.nodes
				},
				...materialNeutralLight.nodes
			]
		}
	]
} as Preset;
