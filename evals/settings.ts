import type {Scalar} from './frontmatter.ts';

export type SettingsReader = ReturnType<typeof settingsReader>;

// Reads the settings of a grader file, with the grader's name in
// every error, so that typos show when the case is loaded.
export const settingsReader = (
	graderName: string,
	fields: Record<string, Scalar>
) => {
	const fail = (message: string): never => {
		throw new Error(`${graderName}: ${message}`);
	};

	const optionalString = (key: string) => {
		const value = fields[key];

		if (value !== undefined && typeof value !== 'string') {
			return fail(`"${key}" must be a string`);
		}

		return value;
	};

	const string = (key: string) => {
		const value = fields[key];

		if (typeof value !== 'string') {
			return fail(`"${key}" is required`);
		}

		return value;
	};

	const optionalNumber = (key: string) => {
		const value = fields[key];

		if (value !== undefined && typeof value !== 'number') {
			return fail(`"${key}" must be a number`);
		}

		return value;
	};

	const compiled = (
		key: string,
		source: string,
		flags?: string
	) => {
		try {
			return new RegExp(source, flags);
		} catch (error) {
			return fail(
				`invalid "${key}": ${(error as Error).message}`
			);
		}
	};

	return {
		string,
		optionalString,
		optionalNumber,

		number: (key: string, fallback: number) =>
			optionalNumber(key) ?? fallback,

		regex: (key: string, flags?: string) =>
			compiled(key, string(key), flags),

		optionalRegex: (key: string) => {
			const source = optionalString(key);

			return source === undefined
				? undefined
				: compiled(key, source);
		},

		oneOf: <T extends string>(
			key: string,
			values: readonly T[],
			fallback?: T
		): T => {
			const value = fields[key];

			if (value === undefined) {
				return fallback ?? fail(`"${key}" is required`);
			}

			if (!values.includes(value as T)) {
				return fail(
					`"${key}" must be ${values.join(' or ')}`
				);
			}

			return value as T;
		}
	};
};
