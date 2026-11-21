import {globSync} from 'node:fs';
import type {SettingsReader} from '../settings.ts';
import type {Context, Result} from './types.ts';

// Passes when a file matches the glob `path`, relative to the run
// directory.
//
//   type: file_exists
//   path: out/*.json
export type FileExists = {path: string};

export const parse = (read: SettingsReader): FileExists => ({
	path: read.string('path')
});

export const run = (
	{path}: FileExists,
	{dir}: Context
): Result => {
	const found = globSync(path, {cwd: dir});

	return {pass: found.length > 0, detail: found.join(', ')};
};
