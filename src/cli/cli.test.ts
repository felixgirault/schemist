import {formatSchemistToHex} from '#lib/color/formatting.js';
import {combine} from '#lib/core/contrast.js';
import {evaluate} from '#lib/core/evaluate.js';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'vite';
import {afterAll, beforeAll, expect, test} from 'vitest';
import {truncate} from './commands.js';
import {parseTreeJson} from './tree.js';

// Runs the built CLI under plain Node: it crashes on runes if a
// store leaks into the core.
let dir: string;
let cli: string;

beforeAll(async () => {
	dir = mkdtempSync(join(tmpdir(), 'schemist-cli-'));
	cli = join(dir, 'schemist.js');
	await build({
		configFile: 'vite.cli.config.js',
		logLevel: 'silent',
		build: {outDir: dir}
	});
}, 60_000);

afterAll(() => rmSync(dir, {recursive: true, force: true}));

const exec = (input: string, ...args: string[]) =>
	spawnSync('node', [cli, ...args], {input, encoding: 'utf8'});

test('eval matches the core', () => {
	const json = JSON.stringify({
		type: 'clr',
		args: {color: 'rgb(59 130 246)'},
		children: [
			{type: 'pos'},
			{type: 'ctr', args: {amount: 90}}
		]
	});
	const entries = evaluate(parseTreeJson(json));
	const {status, stdout} = exec(
		json,
		'eval',
		'-',
		'--contrast',
		'apca'
	);

	expect(status).toBe(0);
	expect(JSON.parse(stdout)).toMatchObject({
		colors: entries.map(({name, color}) => ({
			name,
			hex: formatSchemistToHex(color)
		})),
		combinations: combine(entries, entries, 'wcag3', []).map(
			({bgName, fgName, contrast}) => ({
				bg: bgName,
				fg: fgName,
				level: truncate(contrast.level),
				grade: contrast.grade
			})
		)
	});
});

test('an invalid tree exits with an error naming the path', () => {
	const {status, stdout, stderr} = exec(
		JSON.stringify({
			type: 'clr',
			children: [{type: 'ctr', args: {amount: 500}}]
		}),
		'eval',
		'-'
	);

	expect(status).not.toBe(0);
	expect(stdout).toBe('');
	expect(stderr).toContain('root.children[0].args.amount');
});

test('a tokens export with conflicting names fails', () => {
	const {status, stdout, stderr} = exec(
		JSON.stringify({
			type: 'clr',
			children: [
				{type: 'pos', token: 'brand'},
				{type: 'neg', token: 'brand'}
			]
		}),
		'export',
		'-',
		'--format',
		'tokens'
	);

	expect(status).toBe(1);
	expect(stdout).toBe('');
	expect(stderr).toContain('tokens: conflicting names "brand"');
	expect(stderr).not.toContain('Usage:');
});

test('usage is printed for command line errors only', () => {
	expect(exec('{}', 'nope').stderr).toContain('Usage:');
	expect(
		exec('{"type":"x"}', 'eval', '-').stderr
	).not.toContain('Usage:');
});

test('a node with partial args gets a permalink', () => {
	const {status, stdout} = exec(
		JSON.stringify({
			type: 'clr',
			args: {color: '#3b82f6'},
			children: [{type: 'hlt', args: {amount: 20}}]
		}),
		'eval',
		'-'
	);

	expect(status).toBe(0);
	expect(JSON.parse(stdout).permalink).toContain('?preset=');
});
