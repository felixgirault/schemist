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
import {checkPair, resolvePairs} from '#lib/core/pairs.js';
import {permalink} from '#lib/routing.js';
import {parseArgs} from 'node:util';
import {UsageError} from './errors.js';
import {parsePair} from './pair.js';
import {parseTreeJson} from './tree.js';
import {listPresets, listTypes} from './vocabulary.js';

export const defaultOrigin = 'https://schemist.fglt.fr';

export const usage = `Usage: schemist <command> [options]

Commands:
  types                       List node types and their params
  presets                     List presets
  eval <tree.json|->          Colors, contrast combinations and permalink
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
				'pair': {type: 'string', multiple: true}
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
	const entries = evaluate(tree);
	const link = permalink(tree, values.origin ?? defaultOrigin);

	if (command === 'export') {
		const format = oneOf('format', values.format, [
			'css',
			'sass',
			'tokens'
		]);

		if (format === 'tokens') {
			const {json: tokens, conflicts} = exportTokens(
				entries,
				link
			);

			if (conflicts.length) {
				throw new Error(
					`tokens: conflicting names ${conflicts.map((name) => `"${name}"`).join(', ')}: a name is both a token and a group, repeated, or has a part starting with $; rename them or give them distinct tokens`
				);
			}

			return tokens;
		}

		return exportVariables(
			toExportEntries(
				entries,
				oneOf(
					'color-format',
					values['color-format'],
					['hex', 'rgb', 'hsl', 'lch'] as ColorFormat[],
					defaultExportSettings.colorFormat
				),
				number(
					'precision',
					values.precision,
					defaultExportSettings.precision
				)
			),
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
			link
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
	const parsed = (values.pair ?? []).map(parsePair);
	// the placeholder target is only there to pass the resolver
	const {pairs: picked, errors} = resolvePairs(
		parsed.map(([fg, bg]) => ({fg, bg, wcag2: 0})),
		all
	);

	if (errors.length) {
		const {index, message} = errors[0];

		throw new UsageError(
			`--pair "${values.pair![index]}": ${message}`
		);
	}

	const pairs = picked.map(({fg, bg}): [string, string] => [
		fg.name,
		bg.name
	]);
	const declared = values.pair
		? []
		: resolvePairs(tree.pairs ?? [], all).pairs.map(
				(pair) => ({
					fg: pair.fg.name,
					bg: pair.bg.name,
					checks: checkPair(
						pair,
						pair.fg.rgbColor,
						pair.bg.rgbColor,
						blindness as BlindnessType[]
					)
				})
			);

	return json({
		colors: entries.map(({name, color}) => ({
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
		...(declared.length && {
			pairs: declared.map(({fg, bg, checks}) => ({
				fg,
				bg,
				targets: Object.fromEntries(
					checks.map(({target, goal}) => [target, goal])
				),
				levels: Object.fromEntries(
					checks.map(({target, minLevel}) => [
						target,
						truncate(minLevel)
					])
				),
				pass: checks.every(({pass}) => pass)
			}))
		}),
		permalink: link
	});
};
