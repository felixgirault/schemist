import {writable} from 'svelte/store';
import {
	isDarkSchemeEnabled,
	toggleDarkScheme
} from '$lib/features';

export const isDarkScheme = writable<boolean>(
	isDarkSchemeEnabled()
);

isDarkScheme.subscribe(toggleDarkScheme);

export const colorInputFormat = writable<string>('hex');
