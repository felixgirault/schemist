import {execFileSync, spawnSync} from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadCase} from './cases.ts';
import {grade} from './graders.ts';
import type {Cli, Result} from './graders.ts';
import {gradeCase, report} from './report.ts';
import type {Meta} from './report.ts';
import {casesDir, clone, resultsDir} from './run.ts';

const dirs = (path: string) =>
	readdirSync(path, {withFileTypes: true})
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();

const readJson = (path: string) =>
	existsSync(path)
		? JSON.parse(readFileSync(path, 'utf8'))
		: undefined;

// Grades every run under `dir` with `cli` and returns the report.
export const gradeDir = (
	dir: string,
	cli: Cli,
	cases = casesDir
) =>
	report(
		dirs(dir).map((name) => {
			const c = loadCase(join(cases, name));
			const weights = Object.fromEntries(
				c.graders.map((g) => [g.name, g.weight])
			);

			return gradeCase(
				name,
				weights,
				dirs(join(dir, name)).map((run) => {
					const runDir = join(dir, name, run);
					const transcript = join(
						runDir,
						'transcript.jsonl'
					);
					const context = {
						dir: runDir,
						transcript: existsSync(transcript)
							? readFileSync(transcript, 'utf8')
							: '',
						expect: c.expect,
						cli
					};

					return {
						name: run,
						meta: (readJson(join(runDir, 'meta.json')) ??
							{}) as Meta,
						results: Object.fromEntries(
							c.graders.map((g): [string, Result] => [
								g.name,
								grade(g, context)
							])
						)
					};
				})
			);
		})
	);

// Builds the CLI from `ref` in its own clone, apart from the runs.
const buildCli = (ref: string) => {
	const work = mkdtempSync(join(tmpdir(), 'schemist-grade-'));

	clone(ref, work);
	for (const args of [['ci'], ['run', 'cli:build']])
		execFileSync('npm', args, {cwd: work, stdio: 'ignore'});

	const bin = join(work, 'build-cli', 'schemist.js');
	const cli: Cli = (args, tree) => {
		const {status, stdout, stderr} = spawnSync(
			'node',
			[bin, ...args],
			{
				input: tree,
				encoding: 'utf8'
			}
		);

		if (status) throw new Error(stderr);

		return stdout;
	};

	return {
		cli,
		done: () => rmSync(work, {recursive: true, force: true})
	};
};

export const latest = () => {
	const [last] = dirs(resultsDir).reverse();

	if (!last) throw new Error('No results to grade');

	return join(resultsDir, last);
};

export const gradeAll = (dir = latest()) => {
	const [first] = dirs(dir);
	const [run] = dirs(join(dir, first));
	const ref = readJson(join(dir, first, run, 'meta.json'))?.ref;

	if (!ref)
		throw new Error(
			`${dir}: no ref in the first run's meta.json`
		);

	const {cli, done} = buildCli(ref);

	try {
		const text = gradeDir(dir, cli);

		writeFileSync(join(dir, 'report.md'), text);

		return text;
	} finally {
		done();
	}
};

if (import.meta.main) {
	console.log(gradeAll(process.argv[2]));
}
