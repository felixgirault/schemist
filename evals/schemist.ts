// Runs `schemist <args>` with the tree on stdin and returns stdout.
export type Cli = (args: string[], tree: string) => string;

export type Metric = 'wcag2' | 'apca';

export type Color = {name: string; hex: string};

export type PairLevel = {fg: string; bg: string; level: number};

const allBlindnessTypes =
	'protanomaly,deuteranomaly,tritanomaly';

// `/` separates a pair's colors and `\` escapes it.
const escapedName = (name: string) =>
	name.replaceAll('\\', '\\\\').replaceAll('/', '\\/');

// Throws one error with the CLI's message, whatever went wrong.
const evaluated = (cli: Cli, tree: string, args: string[]) => {
	try {
		return JSON.parse(cli(['eval', '-', ...args], tree));
	} catch (error) {
		throw new Error((error as Error).message.trim());
	}
};

export const colors = (cli: Cli, tree: string): Color[] =>
	evaluated(cli, tree, []).colors;

// The level of each pair in the worst case of the color blindness
// simulations.
export const worstLevels = (
	cli: Cli,
	tree: string,
	metric: Metric,
	pairs: {fg: string; bg: string}[]
): PairLevel[] =>
	evaluated(cli, tree, [
		'--contrast',
		metric,
		'--blindness',
		allBlindnessTypes,
		...pairs.flatMap(({fg, bg}) => [
			'--pair',
			`${escapedName(fg)}/${escapedName(bg)}`
		])
	]).combinations.map(
		({
			fg,
			bg,
			minLevel
		}: {
			fg: string;
			bg: string;
			minLevel: number;
		}) => ({
			fg,
			bg,
			level: minLevel
		})
	);
