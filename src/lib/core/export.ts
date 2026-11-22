import type {ColorFormat} from '#lib/color/formatting.js';
import {
	formatSchemistTo,
	formatSchemistToHex
} from '#lib/color/formatting.js';
import type {PaletteColor} from '#lib/core/evaluate.js';
import type {PairTargets, Role} from '#lib/core/nodes.js';
import type {ResolvedPair} from '#lib/core/pairs.js';
import {
	checkPair,
	targetNames,
	usesOf
} from '#lib/core/pairs.js';
import {cssRule, sassRule} from '#lib/utils/css.js';
import {camelCase, dashCase} from '#lib/utils/strings.js';

export type ExportFormat = 'table' | 'tokens' | 'css' | 'sass';
export type ExportCasing = 'dash' | 'camel';
export interface ExportEntry extends PaletteColor {
	cssColor: string;
}

export type ExportSettings = {
	format: ExportFormat;
	colorFormat: ColorFormat;
	casing: ExportCasing;
	precision: number;
	prefix: string;
};

export const defaultExportSettings: ExportSettings = {
	format: 'table',
	colorFormat: 'hex',
	casing: 'dash',
	precision: 3,
	prefix: ''
};

export type VariablesOptions = {
	format: ExportFormat;
	casing: ExportCasing;
	prefix: string;
};

// What the palette requires, by color id: the pairs checked (rules
// expanded) and the roles.
export type Requirements = {
	pairs: ResolvedPair<string>[];
	roles: Role<string>[];
};

export const noRequirements: Requirements = {
	pairs: [],
	roles: []
};

// A pair seen from one of its colors.
export type Requirement = {
	// the other color
	color: PaletteColor;
	side: 'fg' | 'bg';
	use: string;
	targets: PairTargets;
};

const targetsOf = (pair: PairTargets): PairTargets =>
	Object.fromEntries(
		targetNames.flatMap((name) =>
			pair[name] === undefined ? [] : [[name, pair[name]]]
		)
	);

// "wcag2 4.5, apca 75"
export const formatTargets = (targets: PairTargets) =>
	Object.entries(targets)
		.map(([name, goal]) => `${name} ${goal}`)
		.join(', ');

const useName = (pair: PairTargets) => {
	const {uses, custom} = usesOf(pair);
	const names = uses.map(({name}) => name.toLowerCase());

	return (custom ? [...names, 'custom'] : names).join(', ');
};

// The pairs of each exported color, in the order they are declared.
// Pairs with a color out of `entries` (hidden) or no target are left
// out.
export const requirementsByColor = (
	entries: PaletteColor[],
	{pairs}: Requirements
) => {
	const byId = new Map(entries.map((e) => [e.id, e]));
	const byColor = new Map<string, Requirement[]>();

	for (const pair of pairs) {
		const fg = byId.get(pair.fg);
		const bg = byId.get(pair.bg);
		const targets = targetsOf(pair);

		if (!fg || !bg || !Object.keys(targets).length) continue;

		const use = useName(targets);
		const add = (id: string, requirement: Requirement) =>
			byColor.set(id, [
				...(byColor.get(id) ?? []),
				requirement
			]);

		add(fg.id, {color: bg, side: 'fg', use, targets});
		add(bg.id, {color: fg, side: 'bg', use, targets});
	}

	return byColor;
};

// A pair of differences has no side to read it from.
const isSymmetric = ({targets}: Requirement) =>
	!targets.wcag2 && !targets.apca;

// "body text on --bg-page (wcag2 4.5, apca 75)" for the text, and
// "--text as body text (...)" for its background, `name` being how
// the format writes the other color.
const describe = (
	requirement: Requirement,
	name: (color: PaletteColor) => string
) => {
	const {color, side, use, targets} = requirement;
	const goals = `(${formatTargets(targets)})`;

	return isSymmetric(requirement)
		? `${use} with ${name(color)} ${goals}`
		: side === 'fg'
			? `${use} on ${name(color)} ${goals}`
			: `${name(color)} as ${use} ${goals}`;
};

// Rows of the table export: each pair once, checked as it is,
// without simulations.
export const requirementRows = (
	entries: PaletteColor[],
	requirements: Requirements
) => {
	const byId = new Map(entries.map((e) => [e.id, e]));

	return requirements.pairs.flatMap((pair) => {
		const fg = byId.get(pair.fg);
		const bg = byId.get(pair.bg);
		const targets = targetsOf(pair);

		if (!fg || !bg || !Object.keys(targets).length) return [];

		return [
			{
				id: `${bg.id}-${fg.id}`,
				fg: fg.name,
				bg: bg.name,
				use: useName(targets),
				targets: formatTargets(targets),
				pass: checkPair(
					targets,
					fg.rgbColor,
					bg.rgbColor,
					[]
				).every(({pass}) => pass)
			}
		];
	});
};

export const toExportEntries = (
	entries: PaletteColor[],
	colorFormat: ColorFormat,
	precision: number
): ExportEntry[] =>
	entries.map(({color, ...entry}) => ({
		...entry,
		color,
		cssColor: formatSchemistTo(color, colorFormat, precision)
	}));

// A comment line, or a block when there are several.
const comment = (lines: string[]) =>
	lines.length === 1
		? `/* ${lines[0]} */\n`
		: `/*\n${lines.map((line) => ` * ${line}\n`).join('')} */\n`;

export const exportVariables = (
	entries: ExportEntry[],
	{format, casing, prefix}: VariablesOptions,
	link: string,
	requirements = noRequirements
) => {
	const formatRule = format === 'css' ? cssRule : sassRule;
	const formatCase = casing === 'dash' ? dashCase : camelCase;
	const variable = ({name}: PaletteColor) =>
		formatCase(prefix ? `${prefix} ${name}` : name);
	const reference = (color: PaletteColor) =>
		(format === 'css' ? '--' : '$') + variable(color);
	const byColor = requirementsByColor(entries, requirements);
	const variables = entries
		.map((entry) => {
			const found = byColor.get(entry.id);

			return (
				(found
					? comment(
							found.map((r) => describe(r, reference))
						)
					: '') +
				formatRule(variable(entry), entry.cssColor)
			);
		})
		.join('\n');

	return `/* @see ${link} */\n${variables}`;
};

type Token = {
	$type: 'color';
	$value: string;
	$extensions?: Record<string, unknown>;
};
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

// The key of Schemist's data in `$extensions`, a reverse domain
// name as DTCG asks.
export const tokenExtensionKey = 'fr.fglt.schemist';

// The roles and pairs of a token, nothing if it has none.
const extensionsOf = (roles: string[], pairs: Requirement[]) =>
	roles.length || pairs.length
		? {
				$extensions: {
					[tokenExtensionKey]: {
						...(roles.length ? {roles} : {}),
						...(pairs.length
							? {
									pairs: pairs.map(
										({color, side, use, targets}) => ({
											color: color.name,
											side,
											use,
											targets
										})
									)
								}
							: {})
					}
				}
			}
		: {};

// A token's final path, and why it can't be nested, if so.
const toTokenItems = (
	entries: PaletteColor[],
	requirements: Requirements
) => {
	const byColor = requirementsByColor(entries, requirements);
	const paths = entries.map(({name}) => tokenPath(name));
	const repeated = repeatedKeys(paths.map(pathKey));
	const uniquePaths = withUniquePaths(paths);
	const groups = groupKeys(
		uniquePaths.filter((path) => !hasReservedSegment(path))
	);

	return entries.map(({id, name, color}, i) => ({
		name,
		path: uniquePaths[i],
		token: {
			'$type': 'color',
			'$value': formatSchemistToHex(color),
			...extensionsOf(
				requirements.roles
					.filter(({colors}) => colors.includes(id))
					.map((role) => role.name),
				byColor.get(id) ?? []
			)
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
export const exportTokens = (
	entries: PaletteColor[],
	link: string,
	requirements = noRequirements
) => {
	const items = toTokenItems(entries, requirements);
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
