import type {ExportSettings} from '#lib/core/export.js';
import {defaultExportSettings} from '#lib/core/export.js';

export const exportSettings = $state<ExportSettings>({
	...defaultExportSettings
});
