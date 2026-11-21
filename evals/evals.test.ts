import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {run} from '../src/cli/commands.ts';
import {loadCase, loadGrader} from './cases.ts';
import {parseFrontMatter} from './frontmatter.ts';
import {gradeDir} from './grade.ts';
import {grade} from './graders.ts';
import type {Cli, Context, Grader} from './graders.ts';
import {gradeCase, score} from './report.ts';

const fixtures = join(import.meta.dirname, 'fixtures');
const cases = join(fixtures, 'cases');
const results = join(fixtures, 'results', '2026-01-01T00-00-00');
const dir = (n: number) =>
	join(results, 'dashboard', `run-${n}`);

// The CLI's own code, without building it.
const cli: Cli = (args, tree) => run(args, () => tree);

const context = (
	n: number,
	extra: Partial<Context> = {}
): Context => ({
	dir: dir(n),
	transcript: '',
	cli,
	...extra
});

const grader = (
	type: string,
	fields: Grader['fields'] = {}
): Grader => ({
	name: type,
	type,
	weight: 1,
	description: '',
	fields
});

describe('front matter', () => {
	test('parses flat scalars', () => {
		expect(
			parseFrontMatter(
				[
					'---',
					'a: 3',
					'b: -1.5',
					'c: true',
					'd: plain: text',
					'e: "quoted \\" \\\\d"',
					"f: 'single'",
					'---',
					'',
					'Body',
					''
				].join('\n')
			)
		).toEqual({
			data: {
				a: 3,
				b: -1.5,
				c: true,
				d: 'plain: text',
				e: 'quoted " \\d',
				f: 'single'
			},
			body: 'Body'
		});
	});

	test('no front matter is all body', () => {
		expect(parseFrontMatter('Hello')).toEqual({
			data: {},
			body: 'Hello'
		});
	});

	test.each([
		['an unclosed block', '---\na: 1\n'],
		['a line without a colon', '---\na 1\n---'],
		['an empty value', '---\na:\n---'],
		['a nested key', '---\na:\n  b: 1\n---'],
		['a duplicate key', '---\na: 1\na: 2\n---'],
		['an unclosed quote', '---\na: "x\n---']
	])('rejects %s', (_, text) => {
		expect(() => parseFrontMatter(text)).toThrow();
	});
});

describe('cases', () => {
	test('loads a case with its graders', () => {
		const c = loadCase(join(cases, 'dashboard'));

		expect(c).toMatchObject({
			name: 'dashboard',
			runs: 3,
			maxTurns: 60,
			model: 'opus',
			timeoutSeconds: 1800
		});
		expect(c.graders.map((g) => g.name)).toEqual([
			'apca',
			'blindness',
			'builds',
			'own-color-math',
			'palette',
			'trees-written'
		]);
		expect(c.expect?.pairs).toHaveLength(2);
	});

	test('an unknown grader type is an error', () => {
		expect(() =>
			loadGrader(join(fixtures, 'bad-grader', 'unknown.md'))
		).toThrow('unknown grader type "nope"');
		expect(() => grade(grader('nope'), context(1))).toThrow(
			'unknown grader type'
		);
	});
});

describe('tool_used', () => {
	const transcript = (n: number) =>
		readFileSync(join(dir(n), 'transcript.jsonl'), 'utf8');

	const used = (n: number, fields: Grader['fields']) =>
		grade(
			grader('tool_used', {tool: 'Bash', ...fields}),
			context(n, {transcript: transcript(n)})
		).pass;

	test('matches the JSON-encoded input', () => {
		expect(used(1, {input_match: '--blindness'})).toBe(true);
		expect(used(2, {input_match: '--blindness'})).toBe(false);
	});

	test('min and max bound the count', () => {
		expect(used(1, {input_match: 'eval', min: 2})).toBe(true);
		expect(used(1, {input_match: 'eval', min: 3})).toBe(false);
		expect(used(1, {input_match: 'eval', max: 1})).toBe(false);
		expect(
			used(1, {input_match: 'nothing', min: 0, max: 0})
		).toBe(true);
	});

	test('only counts the given tool', () => {
		expect(used(1, {tool: 'Read', input_match: 'eval'})).toBe(
			false
		);
	});
});

describe('regex', () => {
	test('searches the trace, present or absent', () => {
		const run2 = {transcript: 'import culori'};
		const g = (fields: Grader['fields']) =>
			grade(
				grader('regex', {
					target: 'trace',
					pattern: 'CULORI',
					...fields
				}),
				context(2, run2)
			).pass;

		expect(g({flags: 'i'})).toBe(true);
		expect(g({})).toBe(false);
		expect(g({flags: 'i', expect: 'absent'})).toBe(false);
		expect(g({expect: 'absent'})).toBe(true);
	});

	test('searches a file of the run', () => {
		const g = (path: string, expect: string) =>
			grade(
				grader('regex', {
					target: 'file',
					path,
					pattern: '#1fb5a0',
					expect
				}),
				context(1)
			).pass;

		expect(g('final.md', 'present')).toBe(false);
		expect(g('final.md', 'absent')).toBe(true);
		expect(g('out/missing.json', 'present')).toBe(false);
	});
});

test('file_exists globs from the run directory', () => {
	const exists = (n: number, path: string) =>
		grade(grader('file_exists', {path}), context(n)).pass;

	expect(exists(1, 'out/*.json')).toBe(true);
	expect(exists(1, 'out/dark.json')).toBe(true);
	expect(exists(2, 'out/dark.json')).toBe(false);
});

describe('check', () => {
	const {expect: spec} = loadCase(join(cases, 'dashboard'));
	const check = (n: number, expected = spec) =>
		grade(grader('check'), context(n, {expect: expected}));

	test('passes when every pair meets its targets', () => {
		const result = check(1, {
			...spec!,
			pairs: [spec!.pairs[0], {...spec!.pairs[1], apca: 30}]
		});

		expect(result.problems).toEqual([]);
		expect(result.pass).toBe(true);
		expect(result.pairs).toHaveLength(8);
		expect(result.pairs?.[0]).toMatchObject({
			tree: 'out/light.json',
			fg: 'text/body',
			bg: 'background/page',
			metric: 'wcag2',
			target: 7,
			level: 14.77,
			pass: true
		});
	});

	test('keeps the detail of failing pairs', () => {
		// The dark input border is only Lc 36.91 in the worst case.
		const result = check(1);

		expect(result.pass).toBe(false);
		expect(result.problems).toEqual([]);
		expect(
			result.pairs?.filter(({pass}) => !pass)
		).toMatchObject([
			{
				tree: 'out/dark.json',
				fg: 'border/input',
				metric: 'apca',
				target: 45,
				level: 36.91
			}
		]);
	});

	test('fails on a missing tree', () => {
		expect(check(2).problems).toContain(
			'out/dark.json: missing'
		);
	});

	test('fails on an invalid tree, a missing token, a missing hex', () => {
		const bad = check(1, {
			trees: ['final.md'],
			pairs: [],
			hex: []
		});

		expect(bad.pass).toBe(false);
		expect(bad.problems?.[0]).toContain('final.md: invalid');

		const missing = check(1, {
			trees: ['out/light.json'],
			pairs: [{fg: 'nope', bg: 'background/page', wcag2: 3}],
			hex: ['#123456']
		});

		expect(missing.problems).toEqual([
			'out/light.json: missing token nope',
			'missing hex #123456'
		]);
	});

	test('the worst case of the simulations decides', () => {
		// Dark border/input is 5.17 plain but 5.16 in the worst case.
		const result = check(1, {
			trees: ['out/dark.json'],
			pairs: [
				{
					fg: 'border/input',
					bg: 'background/page',
					wcag2: 5.165
				}
			]
		});

		expect(result.pairs?.[0]).toMatchObject({
			level: 5.16,
			pass: false
		});
	});

	test('a darker body text fails its pair', () => {
		const result = check(3);

		expect(
			result.pairs
				?.filter(({pass}) => !pass)
				.map((p) => p.tree)
		).toContain('out/dark.json');
	});
});

describe('scoring and report', () => {
	test('a run scores the weighted fraction of graders passed', () => {
		expect(
			score({a: 1, b: 3}, {a: {pass: true}, b: {pass: false}})
		).toBe(0.25);
		expect(score({}, {})).toBe(0);
	});

	test('a case scores the mean of its runs', () => {
		const graded = gradeCase('x', {a: 1}, [
			{name: 'run-1', meta: {}, results: {a: {pass: true}}},
			{name: 'run-2', meta: {}, results: {a: {pass: false}}}
		]);

		expect(graded.score).toBe(0.5);
	});

	test('grades the fixture results into a report', () => {
		const text = gradeDir(results, cli, cases);

		expect(text).toBe(
			`${[
				'# Eval report',
				'## dashboard',
				'Score: 0.46',
				[
					'| Grader | Weight | run-1 | run-2 | run-3 |',
					'| --- | --- | --- | --- | --- |',
					'| apca | 1 | ✓ | ✗ | ✓ |',
					'| blindness | 1 | ✓ | ✗ | ✓ |',
					'| builds | 1 | ✓ | ✓ | ✗ |',
					'| own-color-math | 1 | ✓ | ✗ | ✓ |',
					'| palette | 3 | ✗ | ✗ | ✗ |',
					'| trees-written | 1 | ✓ | ✓ | ✓ |',
					'| **Score** |  | 0.63 | 0.25 | 0.50 |',
					'| Cost |  | $1.47 | $0.39 | $0.31 |',
					'| Turns |  | 31 | 12 | 9 |',
					'| Duration |  | 717 s | 102 s | 1800 s |',
					'| Model |  | claude-opus-5-5 | claude-opus-5-5 | claude-opus-5-5 |',
					'| Status |  | ok | ok | killed (SIGTERM) |'
				].join('\n'),
				'Failed checks:',
				[
					'- run-1, palette: out/dark.json: border/input on background/page, apca 36.91 < 45',
					'- run-2, palette: out/dark.json: missing',
					'- run-3, palette: out/dark.json: text/body on background/page, wcag2 5.91 < 7',
					'- run-3, palette: out/dark.json: text/body on background/page, apca 42.06 < 75',
					'- run-3, palette: out/dark.json: border/input on background/page, apca 36.91 < 45'
				].join('\n')
			].join('\n\n')}\n`
		);
	});
});
