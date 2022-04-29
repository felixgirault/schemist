import lightness from '$lib/definitions/nodes/lightness';
import type {Preset} from '$lib/presets';

export default {
	label: 'Scale',
	description: 'Different lightness levels from dark to light',
	nodes: [
		{type: lightness.type, args: {amount: 0}},
		{type: lightness.type, args: {amount: 10}},
		{type: lightness.type, args: {amount: 20}},
		{type: lightness.type, args: {amount: 30}},
		{type: lightness.type, args: {amount: 40}},
		{type: lightness.type, args: {amount: 50}},
		{type: lightness.type, args: {amount: 60}},
		{type: lightness.type, args: {amount: 70}},
		{type: lightness.type, args: {amount: 80}},
		{type: lightness.type, args: {amount: 90}},
		{type: lightness.type, args: {amount: 100}}
	]
} as Preset;
