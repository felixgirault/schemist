import {writable} from 'svelte/store';
import type {Entry} from './combinations';

export type ExportFormat = 'table' | 'css' | 'sass';
export type ExportColorFormat = 'hex' | 'rgb' | 'hsl' | 'lch';
export type ExportCasing = 'dash' | 'camel';
export interface ExportEntry extends Entry {
	cssColor: string;
}

export const exportFormat = writable<ExportFormat>('table');
export const exportColorFormat =
	writable<ExportColorFormat>('hex');
export const exportCasing = writable<ExportCasing>('dash');
export const exportPrecision = writable(3);
