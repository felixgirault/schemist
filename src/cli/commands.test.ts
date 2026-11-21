import {expect, test} from 'vitest';
import {run} from './commands.js';

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
