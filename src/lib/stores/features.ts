import {writable} from 'svelte/store';
import type {ColorFormat} from '$lib/color/formatting';
import {
	isDarkSchemeEnabled,
	toggleDarkScheme
} from '$lib/features';

export const isDarkScheme = writable<boolean>(
	isDarkSchemeEnabled()
);

isDarkScheme.subscribe(toggleDarkScheme);

export const colorInputFormat = writable<ColorFormat>('hex');
