import type {ColorFormat} from '#lib/color/formatting.js';
import type {PaletteColor} from '#lib/stores/palette.svelte.js';

export type ExportFormat = 'table' | 'tokens' | 'css' | 'sass';
export type ExportCasing = 'dash' | 'camel';
export type ExportEntry = PaletteColor & {
	cssColor: string;
};

export type ExportSettings = {
	format: ExportFormat;
	colorFormat: ColorFormat;
	casing: ExportCasing;
	precision: number;
	prefix: string;
};

export const exportSettings = $state<ExportSettings>({
	format: 'table',
	colorFormat: 'hex',
	casing: 'dash',
	precision: 3,
	prefix: ''
});
