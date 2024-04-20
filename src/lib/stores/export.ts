import {writable} from 'svelte/store';
import type {ColorFormat} from '$lib/color/formatting';
import type {Entry} from './combinations';

export type ExportFormat = 'table' | 'tokens' | 'css' | 'sass';
export type ExportCasing = 'dash' | 'camel';
export interface ExportEntry extends Entry {
	cssColor: string;
}

export const exportFormat = writable<ExportFormat>('table');
export const exportColorFormat = writable<ColorFormat>('hex');
export const exportCasing = writable<ExportCasing>('dash');
export const exportPrecision = writable(3);
export const exportPrefix = writable('');
