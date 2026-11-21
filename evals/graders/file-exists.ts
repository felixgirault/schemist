import {globSync} from 'node:fs';
import type {SettingsReader} from '../settings.ts';
import type {Context, Result} from './types.ts';

// Passes when at least `min` (default 1) files match the glob
// `path`, relative to the run directory.
//
//   type: file_exists
//   path: out/{light,dark}.json
//   min: 2
export type FileExists = {path: string; min: number};

export const parse = (read: SettingsReader): FileExists => ({
	path: read.string('path'),
	min: read.number('min', 1)
});

export const run = (
	{path, min}: FileExists,
	{dir}: Context
): Result => {
	const found = globSync(path, {cwd: dir});

	return {pass: found.length >= min, detail: found.join(', ')};
};
