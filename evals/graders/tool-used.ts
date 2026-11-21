import type {SettingsReader} from '../settings.ts';
import {toolCalls} from '../transcript.ts';
import type {Context, Result} from './types.ts';

// Passes when the agent made between `min` (default 1) and `max`
// calls to `tool` whose JSON-encoded input matches `input_match`.
//
//   type: tool_used
//   tool: Bash
//   input_match: --blindness
//   min: 1
export type ToolUsed = {
	tool: string;
	inputMatch: RegExp;
	min: number;
	max?: number;
};

const matchesAnything = /(?:)/;

export const parse = (read: SettingsReader): ToolUsed => ({
	tool: read.string('tool'),
	inputMatch:
		read.optionalRegex('input_match') ?? matchesAnything,
	min: read.number('min', 1),
	max: read.optionalNumber('max')
});

export const run = (
	{tool, inputMatch, min, max}: ToolUsed,
	{transcript}: Context
): Result => {
	const count = toolCalls(transcript).filter(
		(call) =>
			call.name === tool &&
			inputMatch.test(JSON.stringify(call.input))
	).length;

	return {
		pass: count >= min && (max === undefined || count <= max),
		detail: `${count} call(s)`
	};
};
