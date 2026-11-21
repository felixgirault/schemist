import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {SettingsReader} from '../settings.ts';
import type {Context, Result} from './types.ts';

// Passes when `pattern` is found (or, with `expect: absent`, not
// found) in the transcript (`target: trace`) or in a file of the run
// (`target: file`, with a `path` relative to the run directory).
//
//   type: regex
//   target: file
//   path: out/light.json
//   pattern: #be7ef3
//   flags: i
//   expect: present
export type RegexMatch = {
	target: 'trace' | 'file';
	path?: string;
	pattern: RegExp;
	expect: 'present' | 'absent';
};

export const parse = (read: SettingsReader): RegexMatch => {
	const target = read.oneOf('target', ['trace', 'file']);
	const path =
		target === 'file' ? read.string('path') : undefined;
	const expect = read.oneOf(
		'expect',
		['present', 'absent'],
		'present'
	);
	const flags = read.optionalString('flags');

	return {
		target,
		path,
		expect,
		pattern: read.regex('pattern', flags)
	};
};

export const run = (
	{target, path, pattern, expect}: RegexMatch,
	{dir, transcript}: Context
): Result => {
	const shouldBeAbsent = expect === 'absent';

	if (target === 'trace') {
		return {pass: pattern.test(transcript) !== shouldBeAbsent};
	}

	const file = join(dir, path!);

	if (!existsSync(file)) {
		return {pass: shouldBeAbsent, detail: 'no such file'};
	}

	return {
		pass:
			pattern.test(readFileSync(file, 'utf8')) !==
			shouldBeAbsent
	};
};
