import {expect, test} from 'vitest';
import {run} from './commands.js';
import {UsageError} from './errors.js';

const tree = JSON.stringify({
	type: 'clr',
	args: {color: '#3b82f6'},
	children: [{type: 'pos', token: 'Success'}, {type: 'cmp'}]
});
const exec = (...argv: string[]) => run(argv, () => tree);

test('types lists every node type with hex color defaults', () => {
	const types = JSON.parse(exec('types'));
	const clr = types.find(
		({type}: {type: string}) => type === 'clr'
	);

	expect(types.length).toBeGreaterThan(10);
	expect(clr.params).toEqual([
		{name: 'color', kind: 'color', default: '#ffc208'}
	]);
});

test('presets lists presets with hex color args', () => {
	const presets = JSON.parse(exec('presets'));
	expect(JSON.stringify(presets)).not.toMatch(/"h":/);
	expect(presets[0]).toHaveProperty('label');
});

test('eval filters combinations and maps apca to wcag3', () => {
	const all = JSON.parse(exec('eval', '-'));
	const high = JSON.parse(exec('eval', '-', '--min', '3'));
	const apca = JSON.parse(
		exec(
			'eval',
			'-',
			'--contrast',
			'apca',
			'--blindness',
			'protanomaly'
		)
	);

	expect(
		all.colors.map(({name}: {name: string}) => name)
	).toEqual(['Sky dancer', 'Success', 'Falafel']);
	expect(all.combinations).toHaveLength(6);
	expect(high.combinations.length).toBeLessThan(6);
	expect(apca.combinations[0].simulated[0].type).toBe(
		'protanomaly'
	);
	expect(all.permalink).toMatch(
		/^https:\/\/schemist\.fglt\.fr\?preset=/
	);
	expect(
		JSON.parse(exec('eval', '-', '--origin', 'http://x'))
			.permalink
	).toMatch(/^http:\/\/x\?preset=/);
});

test('export prints the text as is', () => {
	expect(
		exec('export', '-', '--format', 'css', '--prefix', 'a')
	).toMatch(
		/^\/\* @see .* \*\/\n--a-sky-dancer: #3b82f6;\n--a-success: /
	);
	expect(
		exec(
			'export',
			'-',
			'--format',
			'sass',
			'--casing',
			'camel',
			'--color-format',
			'rgb'
		)
	).toContain('$skyDancer: rgb(59, 130, 246);');
	expect(
		JSON.parse(exec('export', '-', '--format', 'tokens'))
	).toHaveProperty('Colors.Success.$type', 'color');
});

test.each([
	[[], 'missing command'],
	[['nope'], 'unknown command "nope"'],
	[['eval'], 'expected one tree file'],
	[
		['eval', '-', '--contrast', 'x'],
		'--contrast: expected wcag2, apca'
	],
	[['eval', '-', '--blindness', 'x'], '--blindness: expected'],
	[['eval', '-', '--min', 'x'], '--min: expected a number'],
	[['export', '-'], '--format: expected css, sass, tokens'],
	[
		['export', '-', '--format', 'css', '--casing', 'x'],
		'--casing: expected'
	],
	[['types', 'x'], 'unexpected argument']
])('rejects %j', (argv, message) => {
	expect(() => exec(...argv)).toThrow(message);
});

test('eval accepts nodes with partial args', () => {
	const partial = JSON.stringify({
		type: 'clr',
		args: {color: '#3b82f6'},
		children: [{type: 'hlt', args: {amount: 20}}]
	});

	expect(
		JSON.parse(run(['eval', '-'], () => partial)).permalink
	).toContain('?preset=');
});

test('only command line mistakes are usage errors', () => {
	expect(() => exec('nope')).toThrow(UsageError);
	expect(() => exec('eval', '-', '--nope')).toThrow(UsageError);
	expect(() => run(['eval', '-'], () => '{')).not.toThrow(
		UsageError
	);
	expect(() =>
		run(['eval', '-'], () => '{"type":"x"}')
	).toThrow(/^root\.type/);
	expect(() =>
		run(['eval', '-'], () => '{"type":"x"}')
	).not.toThrow(UsageError);
});

test('eval rounds levels to 2 decimals, filtering on the exact value', () => {
	const {combinations} = JSON.parse(
		exec('eval', '-', '--blindness', 'protanomaly')
	);
	const levels = combinations.flatMap(
		({level, minLevel, simulated}: any) => [
			level,
			minLevel,
			simulated[0].level
		]
	);

	expect(
		levels.every((n: number) => n === Number(n.toFixed(2)))
	).toBe(true);
	// 1.0885… rounds to 1.09 but is below 1.09
	expect(
		JSON.parse(exec('eval', '-', '--min', '1.09')).combinations
			.length
	).toBeLessThan(
		JSON.parse(exec('eval', '-', '--min', '1.08')).combinations
			.length
	);
});

test('eval has minLevel and minGrade only with --blindness', () => {
	const [plain] = JSON.parse(exec('eval', '-')).combinations;
	const [simulated] = JSON.parse(
		exec('eval', '-', '--blindness', 'protanomaly')
	).combinations;

	expect(plain).not.toHaveProperty('minLevel');
	expect(plain).not.toHaveProperty('minGrade');
	expect(simulated.minLevel).toBeLessThanOrEqual(
		simulated.level
	);
	expect(simulated).toHaveProperty('minGrade');
});

test('eval --pair keeps the given pairs in order', () => {
	const {combinations} = JSON.parse(
		exec(
			'eval',
			'-',
			'--pair',
			'Success/Sky dancer',
			'--pair',
			'Falafel/Success'
		)
	);

	expect(
		combinations.map(({fg, bg}: any) => `${fg}/${bg}`)
	).toEqual(['Success/Sky dancer', 'Falafel/Success']);
	expect(
		JSON.parse(
			exec(
				'eval',
				'-',
				'--pair',
				'Success/Sky dancer',
				'--min',
				'5'
			)
		).combinations
	).toEqual([]);
});

test.each([
	[['--pair', 'Success'], '--pair "Success": expected fg/bg'],
	[
		['--pair', 'Nope/Success'],
		'--pair "Nope/Success": unknown color "Nope"'
	],
	[['--pair', 'Success/Nope'], 'unknown color "Nope"'],
	[
		['--pair', 'Success/Success'],
		'--pair "Success/Success": a color is never combined with itself'
	]
])('eval rejects %j', (args, message) => {
	expect(() => exec('eval', '-', ...args)).toThrow(UsageError);
	expect(() => exec('eval', '-', ...args)).toThrow(message);
});
