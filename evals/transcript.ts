export type ToolCall = {name: string; input: unknown};

// The JSON lines of a transcript, skipping the ones that don't parse.
export const events = (transcript: string) =>
	transcript
		.split('\n')
		.filter(Boolean)
		.flatMap((line) => {
			try {
				return [JSON.parse(line)];
			} catch {
				return [];
			}
		});

export const toolCalls = (transcript: string): ToolCall[] =>
	events(transcript)
		.flatMap((event) => event.message?.content ?? [])
		.filter(
			(block: {type?: string}) => block.type === 'tool_use'
		);
