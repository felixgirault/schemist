import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {colors, worstLevels} from '../schemist.ts';
import type {Cli, Metric} from '../schemist.ts';
import type {
	Context,
	Expect,
	PairExpect,
	PairResult,
	Result
} from './types.ts';

// Re-checks the trees of the case's expect.json with the CLI. Passes
// when every tree exists and is valid, has every token of the
// expected pairs, and every pair meets its targets (wcag2, apca) in
// the worst case of the color blindness simulations, in every tree
// (`difference` is the CIEDE2000 difference between the two colors).
// Every expected hex must appear in at least one tree. Takes no
// settings.
//
//   type: check
//   weight: 3
export type Check = Record<string, never>;

const metrics: Metric[] = ['wcag2', 'apca', 'difference'];

type Findings = {
	problems: string[];
	pairs: PairResult[];
	hexes: Set<string>;
};

export const parse = (): Check => ({});

const withBothTokens = (
	tree: string,
	pairs: PairExpect[],
	tokens: string[],
	findings: Findings
) =>
	pairs.filter(({fg, bg}) => {
		const missing = [fg, bg].filter(
			(name) => !tokens.includes(name)
		);

		for (const name of missing) {
			findings.problems.push(
				`${tree}: missing token ${name}`
			);
		}

		return !missing.length;
	});

const checkWorstLevels = (
	cli: Cli,
	tree: string,
	json: string,
	metric: Metric,
	expected: PairExpect[],
	findings: Findings
) => {
	let levels;

	try {
		levels = worstLevels(cli, json, metric, expected);
	} catch (error) {
		findings.problems.push(
			`${tree}: ${metric}: ${(error as Error).message}`
		);

		return;
	}

	for (const pair of expected) {
		const {fg, bg} = pair;
		const target = pair[metric]!;
		const worst = levels.find(
			(l) => l.fg === fg && l.bg === bg
		);

		if (!worst) {
			findings.problems.push(
				`${tree}: ${fg}/${bg}: no result`
			);
			continue;
		}

		findings.pairs.push({
			tree,
			fg,
			bg,
			metric,
			target,
			level: worst.level,
			pass: worst.level >= target
		});
	}
};

const checkTree = (
	tree: string,
	{dir, cli}: Context,
	expectedPairs: PairExpect[],
	findings: Findings
) => {
	const file = join(dir, tree);

	if (!existsSync(file)) {
		findings.problems.push(`${tree}: missing`);

		return;
	}

	const json = readFileSync(file, 'utf8');
	let treeColors;

	try {
		treeColors = colors(cli, json);
	} catch (error) {
		findings.problems.push(
			`${tree}: invalid (${(error as Error).message})`
		);

		return;
	}

	for (const {hex} of treeColors) {
		findings.hexes.add(hex);
	}

	const checkable = withBothTokens(
		tree,
		expectedPairs,
		treeColors.map(({name}) => name),
		findings
	);

	for (const metric of metrics) {
		const withTarget = checkable.filter(
			(pair) => pair[metric] !== undefined
		);

		if (withTarget.length) {
			checkWorstLevels(
				cli,
				tree,
				json,
				metric,
				withTarget,
				findings
			);
		}
	}
};

const expectOf = ({expect}: Context): Expect => {
	if (!expect) {
		throw new Error('the case has no expect.json');
	}

	return expect;
};

export const run = (_check: Check, context: Context): Result => {
	const {
		trees,
		pairs,
		hex: expectedHexes = []
	} = expectOf(context);
	const findings: Findings = {
		problems: [],
		pairs: [],
		hexes: new Set()
	};

	for (const tree of trees) {
		checkTree(tree, context, pairs, findings);
	}

	for (const hex of expectedHexes) {
		if (!findings.hexes.has(hex.toLowerCase())) {
			findings.problems.push(`missing hex ${hex}`);
		}
	}

	return {
		pass:
			!findings.problems.length &&
			findings.pairs.every(({pass}) => pass),
		problems: findings.problems,
		pairs: findings.pairs
	};
};
