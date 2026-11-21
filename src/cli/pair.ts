import {UsageError} from './errors.js';

// Parses `fg/bg`, where `\/` and `\\` stand for a `/` or `\` that is
// part of a name. Returns [fg, bg].
export const parsePair = (
	value: string
): [fg: string, bg: string] => {
	const names = [''];

	for (let i = 0; i < value.length; i++) {
		const char = value[i];
		const next = value[i + 1];

		if (char === '\\' && (next === '/' || next === '\\')) {
			names[names.length - 1] += next;
			i++;
		} else if (char === '/') {
			names.push('');
		} else {
			names[names.length - 1] += char;
		}
	}

	if (names.length !== 2) {
		throw new UsageError(
			`--pair "${value}": expected fg/bg with one unescaped "/" (use \\/ for a "/" in a name)`
		);
	}

	return [names[0], names[1]];
};
