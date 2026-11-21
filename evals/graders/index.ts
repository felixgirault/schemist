import type {Scalar} from '../frontmatter.ts';
import {settingsReader} from '../settings.ts';
import type {SettingsReader} from '../settings.ts';
import * as check from './check.ts';
import * as fileExists from './file-exists.ts';
import * as regex from './regex.ts';
import * as toolUsed from './tool-used.ts';
import type {Context, Result} from './types.ts';

// A grader file, as read: the settings are still raw.
export type GraderFile = {
	name: string;
	type: string;
	weight: number;
	description: string;
	fields: Record<string, Scalar>;
};

export type Grader = {
	name: string;
	type: string;
	weight: number;
	description: string;
	run: (context: Context) => Result;
};

type Run = (context: Context) => Result;

// Parses the settings once, when the case is loaded.
const graderType =
	<Settings>(type: {
		parse: (read: SettingsReader) => Settings;
		run: (settings: Settings, context: Context) => Result;
	}) =>
	(read: SettingsReader): Run => {
		const settings = type.parse(read);

		return (context) => type.run(settings, context);
	};

const graderTypes: Record<
	string,
	(read: SettingsReader) => Run
> = {
	tool_used: graderType(toolUsed),
	regex: graderType(regex),
	file_exists: graderType(fileExists),
	check: graderType(check)
};

export const createGrader = ({
	name,
	type,
	weight,
	description,
	fields
}: GraderFile): Grader => {
	if (!Object.hasOwn(graderTypes, type)) {
		throw new Error(`${name}: unknown grader type "${type}"`);
	}

	const run = graderTypes[type](settingsReader(name, fields));

	return {
		name,
		type,
		weight,
		description,
		run: (context) => {
			try {
				return run(context);
			} catch (error) {
				throw new Error(
					`${name}: ${(error as Error).message}`
				);
			}
		}
	};
};
