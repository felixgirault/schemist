import {execFileSync} from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterAll, describe, expect, test} from 'vitest';
import {run} from '../src/cli/commands.ts';
import {loadCase, loadGrader} from './cases.ts';
import {parseFrontMatter} from './frontmatter.ts';
import {gradeDir} from './grade.ts';
import {createGrader} from './graders/index.ts';
import type {GraderFile} from './graders/index.ts';
import {parse as parseRegex} from './graders/regex.ts';
import type {Context} from './graders/types.ts';
import {gradeCase, report, score} from './report.ts';
import {
	claudeArgs,
	claudeEnv,
	metaOf,
	parseOptions,
	prepareWorkspace,
	withModel
} from './run.ts';
import type {Cli} from './schemist.ts';
import {settingsReader} from './settings.ts';
import {events} from './transcript.ts';

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
	fields: GraderFile['fields'] = {}
) =>
	createGrader({
		name: type,
		type,
		weight: 1,
		description: '',
		fields
	});

const grade = (g: ReturnType<typeof grader>, c: Context) =>
	g.run(c);

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

	const used = (n: number, fields: GraderFile['fields']) =>
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
		const g = (fields: GraderFile['fields']) =>
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

describe('grader fields', () => {
	const load = grader;

	test.each([
		['tool_used', {}, '"tool" is required'],
		[
			'tool_used',
			{tool: 'Bash', min: 'x'},
			'"min" must be a number'
		],
		['regex', {pattern: 'a'}, '"target" is required'],
		['regex', {target: 'dir', pattern: 'a'}, 'trace or file'],
		[
			'regex',
			{target: 'file', pattern: 'a'},
			'"path" is required'
		],
		['regex', {target: 'trace'}, '"pattern" is required'],
		[
			'regex',
			{target: 'trace', pattern: 'a', expect: 'no'},
			'present or absent'
		],
		['file_exists', {}, '"path" is required']
	])('%s %j is rejected', (type, fields, message) => {
		expect(() => load(type, fields)).toThrow(message);
	});

	test('an invalid pattern names the grader and the field', () => {
		expect(() =>
			load('regex', {target: 'trace', pattern: '('})
		).toThrow(/regex: invalid "pattern"/);
		expect(() =>
			load('tool_used', {tool: 'Bash', input_match: '['})
		).toThrow(/tool_used: invalid "input_match"/);
		expect(() =>
			load('regex', {
				target: 'trace',
				pattern: 'a',
				flags: 'zz'
			})
		).toThrow(/invalid "pattern"/);
	});

	test('a pattern is compiled with its flags', () => {
		expect(
			parseRegex(
				settingsReader('regex', {
					target: 'trace',
					pattern: 'a+',
					flags: 'i'
				})
			).pattern
		).toEqual(/a+/i);
	});
});

test('pair names escape backslashes before slashes', () => {
	const seen: string[][] = [];
	const spy: Cli = (args, tree) => {
		seen.push(args);
		return cli(args, tree);
	};
	const tree = JSON.stringify({
		type: 'clr',
		token: 'a\\',
		args: {color: '#000000'},
		children: [{type: 'l', token: 'b/c', args: {amount: 100}}]
	});
	const root = mkdtempSync(
		join(tmpdir(), 'schemist-eval-test-')
	);

	try {
		writeFileSync(join(root, 't.json'), tree);
		grade(grader('check'), {
			dir: root,
			transcript: '',
			cli: spy,
			expect: {
				trees: ['t.json'],
				pairs: [{fg: 'b/c', bg: 'a\\', wcag2: 1}]
			}
		});
	} finally {
		rmSync(root, {recursive: true});
	}

	expect(seen.flat()).toContain('b\\/c/a\\\\');
});

test('events skips lines that are not JSON', () => {
	expect(events('{"a":1}\n\nnope\n{"b":2}\n')).toEqual([
		{a: 1},
		{b: 2}
	]);
});

describe('runner', () => {
	test('options default and validate', () => {
		expect(parseOptions([])).toEqual({
			cases: undefined,
			runs: undefined,
			jobs: 1,
			ref: 'HEAD'
		});
		expect(
			parseOptions([
				'--case',
				'a',
				'--case',
				'b',
				'--runs',
				'2',
				'-j',
				'8',
				'--ref',
				'main'
			])
		).toEqual({
			cases: ['a', 'b'],
			runs: 2,
			jobs: 8,
			ref: 'main'
		});
		expect(() => parseOptions(['-j', '0'])).toThrow('-j');
		expect(() => parseOptions(['-j', '9'])).toThrow('-j');
		expect(() => parseOptions(['--runs', '0'])).toThrow(
			'--runs'
		);
		expect(() => parseOptions(['--runs', 'x'])).toThrow(
			'--runs'
		);
	});

	const c = {
		name: 'x',
		prompt: 'p',
		runs: 3,
		timeoutSeconds: 1,
		graders: []
	};

	test('the command has every isolation flag of the README', () => {
		const readme = readFileSync(
			join(import.meta.dirname, 'README.md'),
			'utf8'
		);
		const block = readme.match(
			/Command that works:\n\n```sh\n([^`]+)```/
		)![1];
		const flags = block.match(/--[a-z-]+/g)!;

		expect(flags).toContain('--setting-sources');
		for (const flag of flags)
			expect(claudeArgs(c)).toContain(flag);

		const args = claudeArgs(c).join(' ');

		expect(args).toContain('--setting-sources project');
		expect(args).toContain('--strict-mcp-config');
		expect(args).toContain('--output-format stream-json');
		expect(args).toContain('--verbose');
		expect(args).toContain('--permission-mode auto');
	});

	test('max turns and model are passed only when set', () => {
		expect(claudeArgs(c)).not.toContain('--max-turns');
		expect(claudeArgs(c)).not.toContain('--model');
		expect(
			claudeArgs({...c, maxTurns: 40, model: 'opus'}).join(
				' '
			)
		).toContain('--max-turns 40 --model opus');
	});

	test('the model option replaces the case model', () => {
		const {model} = parseOptions(['--model', 'sonnet']);

		expect(
			claudeArgs(
				withModel({...c, model: 'opus'}, model)
			).join(' ')
		).toContain('--model sonnet');
		expect(
			claudeArgs(withModel({...c, model: 'opus'})).join(' ')
		).toContain('--model opus');
	});

	test('the environment disables auto memory', () => {
		expect(claudeEnv({PATH: '/bin'})).toEqual({
			PATH: '/bin',
			CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1'
		});
	});
});

describe('prepareWorkspace', () => {
	const tmp = mkdtempSync(
		join(tmpdir(), 'schemist-eval-test-')
	);
	const repo = join(tmp, 'repo');
	const work = join(tmp, 'work');
	const git = (cwd: string, ...args: string[]) =>
		execFileSync(
			'git',
			[
				'-C',
				cwd,
				'-c',
				'user.name=Someone',
				'-c',
				'user.email=someone@example.com',
				...args
			],
			{encoding: 'utf8'}
		);

	afterAll(() => rmSync(tmp, {recursive: true, force: true}));

	test('has the files but never the graders', () => {
		for (const [path, text] of [
			['README.md', 'hello'],
			['src/a.ts', 'a'],
			['evals/cases/x/expect.json', '{"secret":1}']
		]) {
			mkdirSync(join(repo, path, '..'), {recursive: true});
			writeFileSync(join(repo, path), text);
		}

		git(repo, 'init', '-q');
		git(repo, 'add', '-A');
		git(repo, 'commit', '-q', '-m', 'Add evals');
		writeFileSync(join(repo, 'evals/cases/x/prompt.md'), 'p');
		git(repo, 'add', '-A');
		git(repo, 'commit', '-q', '-m', 'More evals');

		mkdirSync(work);
		prepareWorkspace(
			git(repo, 'rev-parse', 'HEAD').trim(),
			work,
			repo
		);

		expect(readFileSync(join(work, 'README.md'), 'utf8')).toBe(
			'hello'
		);
		expect(existsSync(join(work, 'src/a.ts'))).toBe(true);
		expect(existsSync(join(work, 'evals'))).toBe(false);

		const log = git(work, 'log', '--all', '--stat');

		expect(log).not.toContain('evals');
		expect(log).not.toContain('More');
		expect(
			git(work, 'rev-list', '--all', '--count').trim()
		).toBe('1');
		expect(git(work, 'status')).not.toContain('evals');
		expect(git(work, 'status', '--porcelain')).toBe('');
		expect(git(work, 'log', '--format=%an').trim()).toBe(
			'eval'
		);
	}, 30_000);
});

describe('file_exists min and tool alternatives', () => {
	test('min counts the matching files', () => {
		const exists = (min: number) =>
			grade(
				grader('file_exists', {
					path: 'out/{light,dark}.json',
					min
				}),
				context(1)
			).pass;

		expect(exists(2)).toBe(true);
		expect(exists(3)).toBe(false);
		expect(
			grade(
				grader('file_exists', {
					path: 'out/{light,dark}.json',
					min: 2
				}),
				context(2)
			).pass
		).toBe(false);
	});

	test('tool lists alternatives with |', () => {
		const used = (tool: string) =>
			grade(
				grader('tool_used', {
					tool,
					input_match: 'blindness'
				}),
				context(1, {
					transcript: readFileSync(
						join(dir(1), 'transcript.jsonl'),
						'utf8'
					)
				})
			).pass;

		expect(used('Write|Bash')).toBe(true);
		expect(used('Write|Edit')).toBe(false);
	});
});

describe('the cases', () => {
	const casesRoot = join(import.meta.dirname, 'cases');

	test.each(['smoke', 'website', 'dashboard'])(
		'%s loads',
		(name) => {
			const c = loadCase(join(casesRoot, name));

			expect(c.graders.length).toBeGreaterThan(0);
			expect(c.prompt).not.toBe('');
		}
	);

	// What the agent writes, as in a transcript.
	const writes = (tool: string, input: object) =>
		JSON.stringify({
			message: {
				content: [{type: 'tool_use', name: tool, input}]
			}
		});

	const ownMath = (transcript: string) =>
		grade(
			loadCase(join(casesRoot, 'website')).graders.find(
				(g) => g.name === 'no-own-contrast-math'
			)!,
			context(1, {transcript})
		).pass;

	test('tokens-nested wants groups, not slash keys', () => {
		const out = mkdtempSync(
			join(tmpdir(), 'schemist-tokens-')
		);
		mkdirSync(join(out, 'out'));

		const nested = (text: string) => {
			writeFileSync(join(out, 'out/light.tokens.json'), text);

			return grade(
				loadCase(join(casesRoot, 'dashboard')).graders.find(
					(g) => g.name === 'tokens-nested'
				)!,
				context(1, {dir: out})
			).pass;
		};

		try {
			expect(
				nested(
					'{"Colors": {"button/primary/bg": {"$type": "color"}}}'
				)
			).toBe(false);
			expect(
				nested(
					'{"Colors": {"button": {"primary": {"bg": {"$type": "color"}}}}}'
				)
			).toBe(true);
		} finally {
			rmSync(out, {recursive: true, force: true});
		}
	});

	test('own contrast math is flagged, in commands and files', () => {
		const formula =
			'const L = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;';
		const ratio = 'const ratio = (a + 0.05) / (b + 0.05);';

		expect(
			ownMath(
				writes('Write', {
					file_path: 'c.js',
					content: formula
				})
			)
		).toBe(false);
		expect(
			ownMath(writes('Bash', {command: `node -e "${ratio}"`}))
		).toBe(false);
		expect(
			ownMath(
				writes('Edit', {new_string: 'relativeLuminance(x)'})
			)
		).toBe(false);
	});

	test('reading the core, culori and chart distances are fine', () => {
		const reads = JSON.stringify({
			message: {
				content: [
					{
						type: 'tool_result',
						content:
							'const L = 0.2126 * r + 0.7152 * g; // contrast.ts'
					}
				]
			}
		});

		expect(ownMath(reads)).toBe(true);
		expect(
			ownMath(
				writes('Bash', {
					command:
						'node -e "import(\'culori\').then(c => console.log(c.differenceCiede2000()(a, b), c.wcagLuminance(h)))"'
				})
			)
		).toBe(true);
	});
});

describe('run meta', () => {
	const c = {
		name: 'x',
		prompt: 'p',
		runs: 1,
		timeoutSeconds: 1,
		model: 'haiku',
		graders: []
	};
	const exit = {code: 0, signal: null, durationMs: 5};

	test('takes the model that answered and the result figures', () => {
		expect(
			metaOf(c, 'sha', exit, {
				total_cost_usd: 0.003,
				num_turns: 5,
				modelUsage: {'claude-haiku-5-5': {}}
			})
		).toEqual({
			ref: 'sha',
			durationMs: 5,
			cost: 0.003,
			turns: 5,
			model: 'claude-haiku-5-5',
			status: 'ok'
		});
	});

	test('without a result, the case model and an error status', () => {
		expect(metaOf(c, 'sha', {...exit, code: 1}).model).toBe(
			'haiku'
		);
		expect(metaOf(c, 'sha', {...exit, code: 1}).status).toBe(
			'error (exit 1)'
		);
		expect(
			metaOf(c, 'sha', {
				code: null,
				signal: 'SIGTERM',
				durationMs: 1
			}).status
		).toBe('killed (SIGTERM)');
	});

	test('the report shows cents of cheap runs', () => {
		const graded = gradeCase('x', {}, [
			{name: 'run-1', meta: {cost: 0.0028}, results: {}}
		]);

		expect(report([graded])).toContain('| Cost |  | $0.003 |');
	});
});
