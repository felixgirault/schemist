import type {ColorFormat} from '#lib/color/formatting.js';
import type {Entry} from './combinations.svelte';

export type ExportFormat = 'table' | 'tokens' | 'css' | 'sass';
export type ExportCasing = 'dash' | 'camel';
export interface ExportEntry extends Entry {
	cssColor: string;
}

export const exportSettings = $state({
	format: 'table' as ExportFormat,
	colorFormat: 'hex' as ColorFormat,
	casing: 'dash' as ExportCasing,
	precision: 3,
	prefix: ''
});
