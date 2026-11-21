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

export const exportTokens = (entries: Entry[], link: string) => {
	const tokens = Object.fromEntries(
		entries.map(({name, color}) => [
			name,
			{
				'$type': 'color',
				'$value': formatSchemistToHex(color)
			}
		])
	);

	return JSON.stringify(
		{
			'Colors': {
				'$description': `Build with Schemist (${link})`,
				...tokens
			}
		},
		null,
		2
	);
};
