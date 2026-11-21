import {existsSync, globSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {Scalar} from './frontmatter.ts';

export type Grader = {
	name: string;
	type: string;
	weight: number;
	description: string;
	fields: Record<string, Scalar>;
	// Compiled `input_match` or `pattern`, set by `prepare`.
	regex?: RegExp;
};

export type PairExpect = {
	fg: string;
	bg: string;
	wcag2?: number;
	apca?: number;
};

export type Expect = {
	trees: string[];
	pairs: PairExpect[];
	hex?: string[];
};

// Runs `schemist <args>` with the tree on stdin and returns stdout.
export type Cli = (args: string[], tree: string) => string;

export type PairResult = {
	tree: string;
	fg: string;
	bg: string;
	metric: 'wcag2' | 'apca';
	target: number;
	level: number;
	pass: boolean;
};

export type Result = {
	pass: boolean;
	detail?: string;
	// `check` only: what failed besides pairs, and each pair's levels.
	problems?: string[];
	pairs?: PairResult[];
};

export type Context = {
	// The run's directory: `out/` and the other saved files.
	dir: string;
	transcript: string;
	expect?: Expect;
	cli: Cli;
};

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

const toolUses = (
	transcript: string
): {name: string; input: unknown}[] =>
	events(transcript)
		.flatMap((event) => event.message?.content ?? [])
		.filter(
			(block: {type?: string}) => block.type === 'tool_use'
		);

const str = (grader: Grader, key: string) => {
	const value = grader.fields[key];

	if (typeof value !== 'string')
		throw new Error(`${grader.name}: "${key}" is required`);

	return value;
};

const num = (grader: Grader, key: string) => {
	const value = grader.fields[key];

	if (value !== undefined && typeof value !== 'number')
		throw new Error(
			`${grader.name}: "${key}" must be a number`
		);

	return value;
};

const pattern = (
	grader: Grader,
	key: string,
	flags?: string
) => {
	try {
		return new RegExp(str(grader, key), flags);
	} catch (error) {
		throw new Error(
			`${grader.name}: invalid "${key}": ${(error as Error).message}`
		);
	}
};

// Checks the fields of a grader and compiles its pattern, so that
// typos show when the case is loaded, not after a paid run.
export const prepare = (grader: Grader): Grader => {
	const {fields} = grader;

	switch (grader.type) {
		case 'tool_used':
			str(grader, 'tool');
			num(grader, 'min');
			num(grader, 'max');
			return fields.input_match === undefined
				? grader
				: {...grader, regex: pattern(grader, 'input_match')};
		case 'regex': {
			const target = str(grader, 'target');

			if (target !== 'trace' && target !== 'file')
				throw new Error(
					`${grader.name}: "target" must be trace or file`
				);

			if (target === 'file') str(grader, 'path');

			if (
				fields.expect !== undefined &&
				fields.expect !== 'present' &&
				fields.expect !== 'absent'
			)
				throw new Error(
					`${grader.name}: "expect" must be present or absent`
				);

			if (fields.flags !== undefined) str(grader, 'flags');

			return {
				...grader,
				regex: pattern(
					grader,
					'pattern',
					fields.flags as string | undefined
				)
			};
		}
		case 'file_exists':
			str(grader, 'path');
			return grader;
		case 'check':
			return grader;
		default:
			throw new Error(
				`${grader.name}: unknown grader type "${grader.type}"`
			);
	}
};

const toolUsed = (
	grader: Grader,
	{transcript}: Context
): Result => {
	const tool = str(grader, 'tool');
	const match = grader.regex ?? /(?:)/;
	const min = num(grader, 'min') ?? 1;
	const max = num(grader, 'max');
	const count = toolUses(transcript).filter(
		(use) =>
			use.name === tool &&
			match.test(JSON.stringify(use.input))
	).length;

	return {
		pass: count >= min && (max === undefined || count <= max),
		detail: `${count} call(s)`
	};
};

const regexGrader = (
	grader: Grader,
	{dir, transcript}: Context
): Result => {
	const target = str(grader, 'target');
	const absent =
		(grader.fields.expect ?? 'present') === 'absent';
	const regex = grader.regex!;
	let text = '';

	if (target === 'trace') text = transcript;
	else if (target === 'file') {
		const path = join(dir, str(grader, 'path'));
		if (existsSync(path)) text = readFileSync(path, 'utf8');
		else return {pass: absent, detail: 'no such file'};
	} else
		throw new Error(
			`${grader.name}: unknown target "${target}"`
		);

	return {pass: regex.test(text) !== absent};
};

const fileExists = (grader: Grader, {dir}: Context): Result => {
	const found = globSync(str(grader, 'path'), {cwd: dir});

	return {pass: found.length > 0, detail: found.join(', ')};
};

type Eval = {
	colors: {name: string; hex: string}[];
	combinations: {fg: string; bg: string; minLevel: number}[];
};

const escape = (name: string) =>
	name.replaceAll('\\', '\\\\').replaceAll('/', '\\/');

const blindness = [
	'--blindness',
	'protanomaly,deuteranomaly,tritanomaly'
];

// Every pair of `expect.json` must meet its targets, in the worst case
// of the three simulations, in every tree; every hex must appear in at
// least one tree.
const check = (
	grader: Grader,
	{dir, expect, cli}: Context
): Result => {
	if (!expect)
		throw new Error(
			`${grader.name}: the case has no expect.json`
		);

	const problems: string[] = [];
	const pairs: PairResult[] = [];
	const hexes = new Set<string>();

	for (const tree of expect.trees) {
		const path = join(dir, tree);

		if (!existsSync(path)) {
			problems.push(`${tree}: missing`);
			continue;
		}

		const json = readFileSync(path, 'utf8');
		const run = (...args: string[]): Eval | string => {
			try {
				return JSON.parse(cli(['eval', '-', ...args], json));
			} catch (error) {
				return (error as Error).message;
			}
		};
		const base = run();

		if (typeof base === 'string') {
			problems.push(`${tree}: invalid (${base.trim()})`);
			continue;
		}

		for (const {hex} of base.colors) hexes.add(hex);

		const names = base.colors.map(({name}) => name);
		const known = expect.pairs.filter(({fg, bg}) => {
			const missing = [fg, bg].filter(
				(name) => !names.includes(name)
			);

			for (const name of missing)
				problems.push(`${tree}: missing token ${name}`);

			return !missing.length;
		});

		for (const metric of ['wcag2', 'apca'] as const) {
			const wanted = known.filter(
				(pair) => pair[metric] !== undefined
			);

			if (!wanted.length) continue;

			const result = run(
				'--contrast',
				metric,
				...blindness,
				...wanted.flatMap(({fg, bg}) => [
					'--pair',
					`${escape(fg)}/${escape(bg)}`
				])
			);

			if (typeof result === 'string') {
				problems.push(
					`${tree}: ${metric}: ${result.trim()}`
				);
				continue;
			}

			for (const {fg, bg, wcag2, apca} of wanted) {
				const target = (
					metric === 'wcag2' ? wcag2 : apca
				) as number;
				const level = result.combinations.find(
					(c) => c.fg === fg && c.bg === bg
				)?.minLevel;

				if (level === undefined) {
					problems.push(`${tree}: ${fg}/${bg}: no result`);
					continue;
				}

				pairs.push({
					tree,
					fg,
					bg,
					metric,
					target,
					level,
					pass: level >= target
				});
			}
		}
	}

	for (const hex of expect.hex ?? []) {
		if (!hexes.has(hex.toLowerCase()))
			problems.push(`missing hex ${hex}`);
	}

	return {
		pass: !problems.length && pairs.every(({pass}) => pass),
		problems,
		pairs
	};
};

export const types: Record<
	string,
	(grader: Grader, context: Context) => Result
> = {
	tool_used: toolUsed,
	regex: regexGrader,
	file_exists: fileExists,
	check
};

export const grade = (
	grader: Grader,
	context: Context
): Result => {
	const ready = grader.regex ? grader : prepare(grader);

	return types[ready.type](ready, context);
};
