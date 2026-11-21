import {execFileSync, spawn} from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	openSync,
	readFileSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import {listCases, loadCase} from './cases.ts';
import type {Case} from './cases.ts';
import type {Meta} from './report.ts';
import {events} from './transcript.ts';

export const root = join(import.meta.dirname, '..');
export const casesDir = join(import.meta.dirname, 'cases');
export const resultsDir = join(import.meta.dirname, 'results');

export type Options = {
	cases?: string[];
	runs?: number;
	jobs: number;
	ref: string;
};

export const parseOptions = (argv: string[]): Options => {
	const {values} = parseArgs({
		args: argv,
		options: {
			case: {type: 'string', multiple: true},
			runs: {type: 'string'},
			jobs: {type: 'string', short: 'j', default: '1'},
			ref: {type: 'string', default: 'HEAD'}
		}
	});
	const jobs = Number(values.jobs);

	if (!Number.isInteger(jobs) || jobs < 1 || jobs > 8)
		throw new Error('-j: expected an integer from 1 to 8');

	const runs =
		values.runs === undefined
			? undefined
			: Number(values.runs);

	if (
		runs !== undefined &&
		(!Number.isInteger(runs) || runs < 1)
	)
		throw new Error('--runs: expected a positive integer');

	return {
		cases: values.case,
		runs,
		jobs,
		ref: values.ref as string
	};
};

// Clones this repository at `ref` (a commit, so that it is the same
// one for every run) into `dir`.
export const clone = (ref: string, dir: string) => {
	execFileSync('git', [
		'clone',
		'--quiet',
		'--no-checkout',
		root,
		dir
	]);
	execFileSync('git', ['-C', dir, 'checkout', '--quiet', ref]);
};

// Copies the commit into `dir` as a fresh one-commit repository,
// without `evals/`, so that the agent cannot find the graders in the
// files nor in the history. The tarball goes through memory, not a
// shell pipe.
export const prepareWorkspace = (
	sha: string,
	dir: string,
	repo = root
) => {
	const tarball = execFileSync(
		'git',
		['-C', repo, 'archive', sha, '--', ':(exclude)evals'],
		{maxBuffer: 1 << 30}
	);
	const git = (...args: string[]) =>
		execFileSync(
			'git',
			[
				'-C',
				dir,
				'-c',
				'user.name=eval',
				'-c',
				'user.email=eval@example.invalid',
				'-c',
				'commit.gpgsign=false',
				'-c',
				'core.hooksPath=/dev/null',
				...args
			],
			{stdio: 'ignore'}
		);

	execFileSync('tar', ['-x', '-C', dir], {input: tarball});
	git('init', '-q', '-b', 'main');
	git('add', '-A');
	git('commit', '-q', '-m', 'Initial commit');
};

// The environment of the agent: the isolation of evals/README.md.
export const claudeEnv = (
	base: NodeJS.ProcessEnv = process.env
) => ({
	...base,
	CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1'
});

// The isolated command of evals/README.md, plus the case's limits.
// The prompt goes through stdin.
export const claudeArgs = (c: Case) => [
	'-p',
	'--permission-mode',
	'auto',
	'--setting-sources',
	'project',
	'--strict-mcp-config',
	'--output-format',
	'stream-json',
	'--verbose',
	...(c.maxTurns ? ['--max-turns', String(c.maxTurns)] : []),
	...(c.model ? ['--model', c.model] : [])
];

type Exit = {
	code: number | null;
	signal: string | null;
	durationMs: number;
};

// Runs claude in the workspace, with the prompt on stdin and the
// transcript and stderr saved in `dir`.
const runClaude = async (
	c: Case,
	workspace: string,
	dir: string
): Promise<Exit> => {
	const started = Date.now();
	const child = spawn('claude', claudeArgs(c), {
		cwd: workspace,
		env: claudeEnv(),
		stdio: [
			'pipe',
			openSync(join(dir, 'transcript.jsonl'), 'w'),
			openSync(join(dir, 'stderr.log'), 'w')
		],
		timeout: c.timeoutSeconds * 1000
	});

	child.stdin?.on('error', () => {});
	child.stdin?.end(c.prompt);

	return new Promise((resolve) => {
		const exited = (
			code: number | null,
			signal: string | null
		) =>
			resolve({
				code,
				signal,
				durationMs: Date.now() - started
			});

		child.on('error', (error) => exited(null, error.message));
		child.on('close', exited);
	});
};

const statusOf = (
	{code, signal}: Exit,
	result?: {is_error?: boolean}
) => {
	if (signal) {
		return `killed (${signal})`;
	}

	return code || result?.is_error
		? `error (exit ${code})`
		: 'ok';
};

// The model is the one that answered, not the case's alias.
export const metaOf = (
	c: Case,
	ref: string,
	exit: Exit,
	result?: Record<string, any>
): Meta => ({
	ref,
	durationMs: exit.durationMs,
	cost: result?.total_cost_usd,
	turns: result?.num_turns,
	model:
		Object.keys(result?.modelUsage ?? {}).join(', ') ||
		c.model,
	status: statusOf(exit, result)
});

const saveOutputs = (
	workspace: string,
	dir: string,
	finalMessage = ''
) => {
	writeFileSync(join(dir, 'final.md'), `${finalMessage}\n`);

	if (existsSync(join(workspace, 'out'))) {
		cpSync(join(workspace, 'out'), join(dir, 'out'), {
			recursive: true
		});
	}
};

// A run that fails is recorded in its meta.json, not thrown.
const runOne = async (c: Case, dir: string, ref: string) => {
	mkdirSync(dir, {recursive: true});

	const workspace = mkdtempSync(
		join(tmpdir(), 'schemist-eval-')
	);
	let meta: Meta = {ref};

	try {
		prepareWorkspace(ref, workspace);

		const exit = await runClaude(c, workspace, dir);
		const result = events(
			readFileSync(join(dir, 'transcript.jsonl'), 'utf8')
		).findLast((event) => event.type === 'result');

		meta = metaOf(c, ref, exit, result);
		saveOutputs(workspace, dir, result?.result);
	} catch (error) {
		meta.status = `error (${(error as Error).message})`;
	} finally {
		rmSync(workspace, {recursive: true, force: true});
		writeFileSync(
			join(dir, 'meta.json'),
			JSON.stringify(meta, null, '\t')
		);
	}
};

// Runs the cases and returns the results directory.
export const runAll = async ({
	cases,
	runs,
	jobs,
	ref
}: Options) => {
	const sha = execFileSync(
		'git',
		['-C', root, 'rev-parse', ref],
		{
			encoding: 'utf8'
		}
	).trim();
	const out = join(
		resultsDir,
		new Date()
			.toISOString()
			.replace(/\.\d+Z$/, '')
			.replaceAll(':', '-')
	);
	const loaded = (cases ?? listCases(casesDir)).map((name) =>
		loadCase(join(casesDir, name))
	);
	const queue = loaded.flatMap((c) =>
		Array.from({length: runs ?? c.runs}, (_, i) => ({
			c,
			dir: join(out, c.name, `run-${i + 1}`)
		}))
	);

	const worker = async () => {
		for (let job = queue.shift(); job; job = queue.shift()) {
			console.error(
				`running ${job.c.name}/${job.dir.split('/').pop()}`
			);
			await runOne(job.c, job.dir, sha);
		}
	};

	await Promise.all(Array.from({length: jobs}, worker));

	return out;
};

if (import.meta.main) {
	console.log(
		await runAll(parseOptions(process.argv.slice(2)))
	);
}
