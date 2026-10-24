import {pack} from '#lib/packing/index.js';
import {storePalette} from '#lib/palette.js';
import type {PresetNode} from '#lib/presets.js';
import {
	changedArg,
	parseTree,
	serializeTree
} from '#lib/presets.js';
import {presetQuery} from '#lib/routing.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {debounce} from '#lib/utils/functions.js';
import {History} from '#lib/utils/history.svelte.js';
import {goto} from '$app/navigation';
import {untrack} from 'svelte';

const read = () =>
	$state.snapshot(serializeTree(palette.root)) as PresetNode;

const syncUrl = (snapshot: PresetNode) =>
	goto(location.pathname + presetQuery(snapshot), {
		replace: true,
		shallow: true,
		state: {}
	});

// States change on every slider step, which is too often to
// rewrite the URL.
const persist = debounce((snapshot: PresetNode) => {
	storePalette(pack(snapshot));
	syncUrl(snapshot);
}, 300);

// Every change of the palette is recorded, see ADR 2.
export const history = new History<PresetNode>({
	restore: (snapshot) => {
		palette.root = parseTree(snapshot);
	},
	onChange: persist,
	group: changedArg
});

// The URL shows the palette right away, but storage only changes
// on edits, so opening a link keeps the stored palette.
export const startHistory = () => {
	const snapshot = read();
	history.reset(snapshot);
	syncUrl(snapshot);
};

$effect.root(() => {
	$effect(() => {
		if (palette.root) {
			const snapshot = read();
			untrack(() => history.record(snapshot));
		}
	});
});
