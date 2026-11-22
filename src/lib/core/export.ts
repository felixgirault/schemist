import type {ColorFormat} from '#lib/color/formatting.js';
import {
	formatSchemistTo,
	formatSchemistToHex
} from '#lib/color/formatting.js';
import type {Entry} from '#lib/core/evaluate.js';
import {cssRule, sassRule} from '#lib/utils/css.js';
import {camelCase, dashCase} from '#lib/utils/strings.js';

export type ExportFormat = 'table' | 'tokens' | 'css' | 'sass';
export type ExportCasing = 'dash' | 'camel';
export interface ExportEntry extends Entry {
	cssColor: string;
}

export const defaultExportSettings = {
	format: 'table' as ExportFormat,
	colorFormat: 'hex' as ColorFormat,
	casing: 'dash' as ExportCasing,
	precision: 3,
	prefix: ''
};

export type VariablesOptions = {
	format: ExportFormat;
	casing: ExportCasing;
	prefix: string;
};

export const toExportEntries = (
	entries: Entry[],
	colorFormat: ColorFormat,
	precision: number
): ExportEntry[] =>
	entries.map(({color, ...entry}) => ({
		...entry,
		color,
		cssColor: formatSchemistTo(color, colorFormat, precision)
	}));

export const exportVariables = (
	entries: ExportEntry[],
	{format, casing, prefix}: VariablesOptions,
	link: string
) => {
	const formatRule = format === 'css' ? cssRule : sassRule;
	const formatCase = casing === 'dash' ? dashCase : camelCase;
	const variables = entries
		.map(({name, cssColor}) =>
			formatRule(
				formatCase(prefix ? `${prefix} ${name}` : name),
				cssColor
			)
		)
		.join('\n');

	return `/* @see ${link} */\n${variables}`;
};

type Token = {$type: 'color'; $value: string};
type TokenGroup = {[key: string]: string | Token | TokenGroup};

// Splits on runs of slashes and dots, like `words()`, but keeps
// spaces. A name made of separators only stays whole.
const tokenPath = (name: string) => {
	const path = name.split(/[/.]+/).filter(Boolean);
	return path.length ? path : [name];
};

// Segments hold no slash, so joining on one is unambiguous.
const pathKey = (path: string[]) => path.join('/');

const repeatedKeys = (keys: string[]) =>
	new Set(keys.filter((key, i) => keys.indexOf(key) !== i));

// The second and later colors of a path get ` (2)`, ` (3)`... on
// its last segment, in tree order.
const withUniquePaths = (paths: string[][]) => {
	const taken = new Set<string>();

	return paths.map((path) => {
		const last = path.at(-1)!;
		let unique = path;

		for (let n = 2; taken.has(pathKey(unique)); n++) {
			unique = [...path.slice(0, -1), `${last} (${n})`];
		}

		taken.add(pathKey(unique));

		return unique;
	});
};

// Keys of the paths that hold other paths.
const groupKeys = (paths: string[][]) =>
	new Set(
		paths.flatMap((path) =>
			path
				.slice(0, -1)
				.map((_, i) => pathKey(path.slice(0, i + 1)))
		)
	);

// `$` segments would read as DTCG properties (`$value`, `$type`).
const hasReservedSegment = (path: string[]) =>
	path.some((segment) => segment.startsWith('$'));

const flatKey = (name: string) =>
	name.replace(/(^|[/.])\$/g, '$1') || name;

const nestToken = (
	colors: TokenGroup,
	path: string[],
	token: Token
) => {
	const group = path
		.slice(0, -1)
		.reduce(
			(parent, segment) =>
				(parent[segment] ??= {}) as TokenGroup,
			colors
		);

	group[path.at(-1)!] = token;
};

const placeFlatToken = (
	colors: TokenGroup,
	key: string,
	token: Token
) => {
	let free = key;

	for (let n = 2; free in colors; n++) {
		free = `${key} (${n})`;
	}

	colors[free] = token;
};

// A token's final path, and why it can't be nested, if so.
const toTokenItems = (entries: Entry[]) => {
	const paths = entries.map(({name}) => tokenPath(name));
	const repeated = repeatedKeys(paths.map(pathKey));
	const uniquePaths = withUniquePaths(paths);
	const groups = groupKeys(
		uniquePaths.filter((path) => !hasReservedSegment(path))
	);

	return entries.map(({name, color}, i) => ({
		name,
		path: uniquePaths[i],
		token: {
			'$type': 'color',
			'$value': formatSchemistToHex(color)
		} as Token,
		isRepeated: repeated.has(pathKey(paths[i])),
		isFlat:
			hasReservedSegment(uniquePaths[i]) ||
			groups.has(pathKey(uniquePaths[i]))
	}));
};

const conflictNames = (
	items: ReturnType<typeof toTokenItems>
) => [
	...new Set(
		items
			.filter(({isFlat, isRepeated}) => isFlat || isRepeated)
			.map(({name}) => name)
	)
];

// Nests tokens under `Colors` along their name's path. Tokens that
// can't be nested stay flat under their name, and all of them are
// returned in `conflicts`, so no color is dropped. Group paths are
// known before placing anything, so the result doesn't depend on
// whether a group or its token comes first in the tree.
export const exportTokens = (entries: Entry[], link: string) => {
	const items = toTokenItems(entries);
	const colors: TokenGroup = {
		'$description': `Build with Schemist (${link})`
	};

	items
		.filter(({isFlat}) => !isFlat)
		.forEach(({path, token}) =>
			nestToken(colors, path, token)
		);
	items
		.filter(({isFlat}) => isFlat)
		.forEach(({name, token}) =>
			placeFlatToken(colors, flatKey(name), token)
		);

	return {
		json: JSON.stringify({'Colors': colors}, null, 2),
		conflicts: conflictNames(items)
	};
};
