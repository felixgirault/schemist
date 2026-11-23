// Runs `schemist <args>` with the tree on stdin and returns stdout.
export type Cli = (args: string[], tree: string) => string;

export type Metric = 'wcag2' | 'apca' | 'difference';

// `variant` only for a tree with variants, one entry per variant.
export type Color = {
	name: string;
	hex: string;
	variant?: string;
};

export type PairLevel = {
	fg: string;
	bg: string;
	level: number;
	variant?: string;
};

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
// simulations. The `difference` metric is the CIEDE2000 difference.
export const worstLevels = (
	cli: Cli,
	tree: string,
	metric: Metric,
	pairs: {fg: string; bg: string}[]
): PairLevel[] =>
	evaluated(cli, tree, [
		...(metric === 'difference'
			? ['--difference']
			: ['--contrast', metric]),
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
			variant,
			minLevel,
			difference
		}: {
			fg: string;
			bg: string;
			variant?: string;
			minLevel: number;
			difference?: {minLevel: number};
		}) => ({
			fg,
			bg,
			...(variant === undefined ? {} : {variant}),
			level: (difference ?? {minLevel}).minLevel
		})
	);
