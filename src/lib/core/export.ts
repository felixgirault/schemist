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

// Nests tokens under `Colors` along their name's path. A path
// shared by several colors gets ` (2)`, ` (3)`... on its last
// segment, in tree order. A token that is also the prefix of
// other paths stays flat under its full name. Both are returned
// in `conflicts`, so no color is dropped. Prefixes are computed
// on all paths before placing anything, so the result doesn't
// depend on whether the group or the token comes first.
export const exportTokens = (entries: Entry[], link: string) => {
	const used = new Set<string>();
	const repeated = new Set<string>();
	const flagged = new Set<string>();
	const items = entries.map(({name, color}) => {
		const path = tokenPath(name);
		const last = path.pop()!;
		const base = [...path, last].join('\0');
		let flatName = name;
		let key = base;

		for (let n = 2; used.has(key); n++) {
			repeated.add(base);
			flatName = `${name} (${n})`;
			key = [...path, `${last} (${n})`].join('\0');
		}

		used.add(key);
		const parts = key.split('\0');
		return {
			name,
			base,
			flatName,
			path: parts,
			token: {
				'$type': 'color',
				'$value': formatSchemistToHex(color)
			} as Token
		};
	});

	// Repeated paths are conflicts from their first color too.
	items.forEach(({name, base}) => {
		if (repeated.has(base)) flagged.add(name);
	});

	const groups = new Set(
		items.flatMap(({path}) =>
			path
				.slice(0, -1)
				.map((_, i) => path.slice(0, i + 1).join('\0'))
		)
	);
	const colors: TokenGroup = {
		'$description': `Build with Schemist (${link})`
	};
	const flat: typeof items = [];

	items.forEach((item) => {
		if (groups.has(item.path.join('\0'))) {
			flagged.add(item.name);
			flat.push(item);
			return;
		}

		const group = item.path
			.slice(0, -1)
			.reduce<TokenGroup>(
				(parent, segment) =>
					(parent[segment] ??= {}) as TokenGroup,
				colors
			);
		group[item.path.at(-1)!] = item.token;
	});

	flat.forEach(({flatName, token}) => {
		let key = flatName;
		for (let n = 2; key in colors; n++) {
			key = `${flatName} (${n})`;
		}
		colors[key] = token;
	});

	return {
		json: JSON.stringify({'Colors': colors}, null, 2),
		// In tree order.
		conflicts: [
			...new Set(
				items
					.map(({name}) => name)
					.filter((n) => flagged.has(n))
			)
		]
	};
};
