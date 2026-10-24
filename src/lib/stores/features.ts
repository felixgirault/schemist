import type {ColorFormat} from '#lib/color/formatting.js';
import {
	isDarkSchemeEnabled,
	toggleDarkScheme
} from '#lib/features.js';
import {writable} from 'svelte/store';

export const isDarkScheme = writable<boolean>(
	isDarkSchemeEnabled()
);

isDarkScheme.subscribe(toggleDarkScheme);

export const colorInputFormat = writable<ColorFormat>('hex');
