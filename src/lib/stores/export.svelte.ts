import type {ColorFormat} from '#lib/color/formatting.js';
import type {
	ExportCasing,
	ExportFormat
} from '#lib/core/export.js';

export const exportSettings = $state({
	format: 'table' as ExportFormat,
	colorFormat: 'hex' as ColorFormat,
	casing: 'dash' as ExportCasing,
	precision: 3,
	prefix: ''
});
