import type {Readable} from 'svelte/store';
import {derived} from 'svelte/store';
import {debounce} from './functions';
import type {DebounceTimeout} from './functions';

export const debouncedStore = <T>(
	store: Readable<T>,
	timeout: DebounceTimeout
) => {
	const debounced = debounce((value, set) => {
		set(value);
	}, timeout);

	let first = true;

	// `derived` relies on the callback signature to tell
	// if `set` is used, so we can't use `debounced` directly
	return derived<Readable<T>, T>(store, (value, set) => {
		if (first) {
			set(value);
			first = false;
		} else {
			debounced(value, set);
		}
	});
};
