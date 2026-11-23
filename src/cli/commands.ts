import {formatSchemistToHex} from '#lib/color/formatting.js';
import type {ColorFormat} from '#lib/color/formatting.js';
import type {RgbColor} from '#lib/color/types.js';
import type {
	BlindnessType,
	Combination
} from '#lib/core/contrast.js';
import {combine} from '#lib/core/contrast.js';
import {difference} from '#lib/core/difference.js';
import {evaluate} from '#lib/core/evaluate.js';
import {
	defaultExportSettings,
	exportTokens,
	exportVariables,
	toExportEntries
} from '#lib/core/export.js';
import type {ExportCasing} from '#lib/core/export.js';
import {
	checkPair,
	resolvePairs,
	targetNames
} from '#lib/core/pairs.js';
import {permalink} from '#lib/routing.js';
import {parseArgs} from 'node:util';
import {UsageError} from './errors.js';
import {parsePair} from './pair.js';
import {
	declaredPairs,
	exportRequirements,
	inVariant,
	parseTreeJson,
	variantsOf
} from './tree.js';
import {listPresets, listTypes} from './vocabulary.js';

export const defaultOrigin = 'https://schemist.fglt.fr';

export const usage = `Usage: schemist <command> [options]

Commands:
  types                       List node types and their params
  presets                     List presets
  eval <tree.json|->          Colors, contrast combinations and permalink,
                              for every variant
  export <tree.json|->        Export colors as CSS, Sass or design tokens

eval options:
  --contrast wcag2|apca       Contrast metric (default wcag2)
  --blindness a,b,c           protanomaly, deuteranomaly, tritanomaly
  --difference                Add the CIEDE2000 color difference of each pair
  --min <level>               Only combinations with a min level >= level
  --pair 'fg/bg'              Only this pair, repeatable, in the given order
                              (use \\/ for a "/" in a name); replaces the
                              tree's declared pairs

export options:
  --format css|sass|tokens    Required
  --variant <name>            The variant to export (default: the base, the
                              tree's first)
  --color-format hex|rgb|hsl|lch, --casing dash|camel,
  --prefix <text>, --precision <digits>

Common options:
  --origin <url>              Permalink origin (default ${defaultOrigin})
`;

const oneOf = <T extends string>(
	name: string,
	value: string | undefined,
	values: readonly T[],
	fallback?: T
): T => {
	if (value === undefined && fallback) return fallback;

	if (!values.includes(value as T)) {
		throw new UsageError(
			`--${name}: expected ${values.join(', ')}`
		);
	}

	return value as T;
};

const number = (
	name: string,
	value: string | undefined,
	fallback: number
) => {
	if (value === undefined) return fallback;
	const n = Number(value);

	if (value.trim() === '' || !Number.isFinite(n)) {
		throw new UsageError(`--${name}: expected a number`);
	}

	return n;
};

const blindnessTypes = [
	'protanomaly',
	'deuteranomaly',
	'tritanomaly'
] as const;

const parse = (argv: string[]) => {
	try {
		return parseArgs({
			args: argv,
			allowPositionals: true,
			options: {
				'contrast': {type: 'string'},
				'blindness': {type: 'string'},
				'min': {type: 'string'},
				'difference': {type: 'boolean'},
				'format': {type: 'string'},
				'color-format': {type: 'string'},
				'casing': {type: 'string'},
				'prefix': {type: 'string'},
				'precision': {type: 'string'},
				'origin': {type: 'string'},
				'pair': {type: 'string', multiple: true},
				'variant': {type: 'string'}
			}
		});
	} catch (error) {
		throw new UsageError((error as Error).message);
	}
};

// Two decimals, never rounded up: 4.496 must not read as the 4.5 AA
// threshold.
export const truncate = (level: number) =>
	Math.floor(level * 100) / 100;

const differenceOf = (
	a: RgbColor,
	b: RgbColor,
	blindness: BlindnessType[]
) => {
	const {level, simulated, minLevel} = difference(
		a,
		b,
		blindness
	);

	return {
		level: truncate(level),
		...(blindness.length && {minLevel: truncate(minLevel)}),
		simulated: simulated.map(({type, level}) => ({
			type,
			level: truncate(level)
		}))
	};
};

// Keeps the combinations of the given [fg, bg] pairs, in that order;
// all of them when there are no pairs.
const pick = (all: Combination[], pairs: [string, string][]) =>
	pairs.length
		? pairs.flatMap(([fg, bg]) =>
				all.filter((c) => c.fgName === fg && c.bgName === bg)
			)
		: all;

// Returns the text to print. `read` gives the content of a file path
// or of stdin (`-`).
export const run = (
	argv: string[],
	read: (path: string) => string
): string => {
	const {values, positionals} = parse(argv);
	const [command, input, ...extra] = positionals;
	const json = (data: unknown) => JSON.stringify(data, null, 2);

	if (command === 'types' || command === 'presets') {
		if (input)
			throw new UsageError(`${command}: unexpected argument`);
		return json(
			command === 'types' ? listTypes() : listPresets()
		);
	}

	if (command !== 'eval' && command !== 'export') {
		throw new UsageError(
			command
				? `unknown command "${command}"`
				: 'missing command'
		);
	}

	if (!input || extra.length) {
		throw new UsageError(
			`${command}: expected one tree file, or - for stdin`
		);
	}

	const tree = parseTreeJson(read(input));
	const variant = values.variant;

	if (variant !== undefined) {
		if (command !== 'export') {
			throw new UsageError(
				'--variant: only for export, eval checks every variant'
			);
		}

		if (!tree.variants?.includes(variant)) {
			throw new UsageError(
				tree.variants
					? `--variant: expected ${tree.variants.join(', ')}`
					: '--variant: the tree has no variants'
			);
		}
	}

	const entries = inVariant(tree, variant);
	const link = permalink(tree, values.origin ?? defaultOrigin);

	if (command === 'export') {
		const requirements = exportRequirements(tree);
		const format = oneOf('format', values.format, [
			'css',
			'sass',
			'tokens'
		]);

		if (format === 'tokens') {
			const {json: tokens, conflicts} = exportTokens(
				entries,
				link,
				requirements
			);

			if (conflicts.length) {
				throw new Error(
					`tokens: conflicting names ${conflicts.map((name) => `"${name}"`).join(', ')}: a name is both a token and a group, repeated, or has a part starting with $; rename them or give them distinct tokens`
				);
			}

			return tokens;
		}

		const colorFormat = oneOf(
			'color-format',
			values['color-format'],
			['hex', 'rgb', 'hsl', 'lch'] as ColorFormat[],
			defaultExportSettings.colorFormat
		);
		const precision = number(
			'precision',
			values.precision,
			defaultExportSettings.precision
		);
		const formatted = (list: typeof entries) =>
			toExportEntries(list, colorFormat, precision);

		return exportVariables(
			// CSS has a block per variant whatever --variant says, the
			// base first (Sass has one file each).
			formatted(format === 'css' ? inVariant(tree) : entries),
			{
				format,
				casing: oneOf(
					'casing',
					values.casing,
					['dash', 'camel'] as ExportCasing[],
					defaultExportSettings.casing
				),
				prefix: values.prefix ?? defaultExportSettings.prefix
			},
			link,
			requirements,
			format === 'css'
				? (tree.variants ?? []).slice(1).map((name) => ({
						name,
						entries: formatted(inVariant(tree, name))
					}))
				: []
		);
	}

	const contrast = oneOf(
		'contrast',
		values.contrast,
		['wcag2', 'apca'],
		'wcag2'
	);
	const blindness = values.blindness
		? values.blindness
				.split(',')
				.map((type) =>
					oneOf('blindness', type, blindnessTypes)
				)
		: [];
	const min = number('min', values.min, 0);
	// --pair can name hidden colors, like declared pairs
	const all = evaluate(tree, true);
	// a repeated --pair is the same pair, not one declared twice
	const pairValues = [...new Set(values.pair ?? [])];
	// the placeholder target is only there to pass the resolver
	const {pairs: picked, errors} = resolvePairs(
		pairValues
			.map(parsePair)
			.map(([fg, bg]) => ({fg, bg, wcag2: 0})),
		all
	);

	if (errors.length) {
		const {index, message} = errors[0];

		throw new UsageError(
			`--pair "${pairValues[index]}": ${message}`
		);
	}

	const pairs = picked.map(({fg, bg}): [string, string] => [
		fg.name,
		bg.name
	]);
	const visible = new Set(entries.map(({id}) => id));
	// One result per variant, each tagged with it when there are any.
	const results = variantsOf(tree).map((variant) => {
		const tag = variant === undefined ? {} : {variant};
		const entries = inVariant(tree, variant);
		const all = inVariant(tree, variant, true);
		const declared = values.pair
			? []
			: declaredPairs(tree, all).map((pair) => {
					const sources = [
						...pair.sources.rules.map(
							(i) => `rules[${i}]`
						),
						...(pair.sources.oneOff ? ['pairs'] : [])
					];
					const fg = pair.fg.name;
					const bg = pair.bg.name;

					// hidden colors are not exported, so not checked, as in the app
					if (
						!visible.has(pair.fg.id) ||
						!visible.has(pair.bg.id)
					) {
						return {
							...tag,
							fg,
							bg,
							sources,
							targets: Object.fromEntries(
								targetNames
									.filter(
										(name) => pair[name] !== undefined
									)
									.map((name) => [name, pair[name]])
							),
							hidden: true
						};
					}

					const checks = checkPair(
						pair,
						pair.fg.rgbColor,
						pair.bg.rgbColor,
						blindness as BlindnessType[]
					);

					return {
						...tag,
						fg,
						bg,
						sources,
						targets: Object.fromEntries(
							checks.map(({target, goal}) => [
								target,
								goal
							])
						),
						levels: Object.fromEntries(
							checks.map(({target, minLevel}) => [
								target,
								truncate(minLevel)
							])
						),
						pass: checks.every(({pass}) => pass)
					};
				});

		return {
			colors: entries.map(({name, color}) => ({
				...tag,
				name,
				hex: formatSchemistToHex(color)
			})),
			combinations: pick(
				combine(
					pairs.length ? all : entries,
					pairs.length ? all : entries,
					contrast === 'apca' ? 'wcag3' : 'wcag2',
					blindness as BlindnessType[]
				).filter(({minLevel}) => minLevel >= min),
				pairs
			).map(
				({
					bgName,
					fgName,
					contrast,
					minLevel,
					minGrade,
					simulatedContrasts
				}) => ({
					...tag,
					bg: bgName,
					fg: fgName,
					level: truncate(contrast.level),
					grade: contrast.grade,
					...(blindness.length && {
						minLevel: truncate(minLevel),
						minGrade
					}),
					simulated: simulatedContrasts.map(
						({type, level, grade}) => ({
							type,
							level: truncate(level),
							grade
						})
					),
					...(values.difference && {
						difference: differenceOf(
							contrast.bg,
							contrast.fg,
							blindness as BlindnessType[]
						)
					})
				})
			),
			declared
		};
	});
	const declared = results.flatMap((result) => result.declared);

	return json({
		colors: results.flatMap((result) => result.colors),
		combinations: results.flatMap(
			(result) => result.combinations
		),
		...(declared.length && {pairs: declared}),
		permalink: link
	});
};
