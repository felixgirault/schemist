import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {basename, join} from 'node:path';
import {parseFrontMatter} from './frontmatter.ts';
import type {Scalar} from './frontmatter.ts';
import {types} from './graders.ts';
import type {Expect, Grader} from './graders.ts';

export type Case = {
	name: string;
	prompt: string;
	runs: number;
	maxTurns?: number;
	timeoutSeconds: number;
	model?: string;
	graders: Grader[];
	expect?: Expect;
};

const read = (path: string) => readFileSync(path, 'utf8');

const option = <T extends Scalar>(
	data: Record<string, Scalar>,
	key: string,
	type: 'string' | 'number',
	fallback?: T
) => {
	const value = data[key] ?? fallback;

	if (value !== undefined && typeof value !== type)
		throw new Error(`"${key}" must be a ${type}`);

	return value as T;
};

export const loadGrader = (path: string): Grader => {
	const name = basename(path, '.md');
	const {data, body} = parseFrontMatter(read(path));
	const {type, weight, ...fields} = data;

	if (typeof type !== 'string' || !types[type])
		throw new Error(`${name}: unknown grader type "${type}"`);

	if (
		weight !== undefined &&
		(typeof weight !== 'number' || weight <= 0)
	)
		throw new Error(
			`${name}: weight must be a positive number`
		);

	return {
		name,
		type,
		weight: (weight as number) ?? 1,
		description: body,
		fields
	};
};

export const loadCase = (dir: string): Case => {
	const {data, body} = parseFrontMatter(
		read(join(dir, 'prompt.md'))
	);
	const graders = join(dir, 'graders');
	const expect = join(dir, 'expect.json');

	return {
		name: basename(dir),
		prompt: body,
		runs: option(data, 'runs', 'number', 3),
		maxTurns: option(data, 'max_turns', 'number'),
		timeoutSeconds: option(
			data,
			'timeout_seconds',
			'number',
			1800
		),
		model: option(data, 'model', 'string'),
		graders: existsSync(graders)
			? readdirSync(graders)
					.filter((file) => file.endsWith('.md'))
					.sort()
					.map((file) => loadGrader(join(graders, file)))
			: [],
		expect: existsSync(expect)
			? JSON.parse(read(expect))
			: undefined
	};
};

export const listCases = (root: string) =>
	readdirSync(root, {withFileTypes: true})
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
