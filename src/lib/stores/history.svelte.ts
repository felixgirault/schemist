import {pack} from '#lib/packing/index.js';
import {storePalette} from '#lib/palette.js';
import type {PresetNode} from '#lib/presets.js';
import {parseTree, serializeTree} from '#lib/presets.js';
import {presetQuery} from '#lib/routing.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {debounce} from '#lib/utils/functions.js';
import {History} from '#lib/utils/history.svelte.js';
import {goto} from '$app/navigation';

const read = () =>
	$state.snapshot(serializeTree(palette.root)) as PresetNode;

const syncUrl = (snapshot: PresetNode) =>
	goto(location.pathname + presetQuery(snapshot), {
		replace: true,
		shallow: true,
		state: {}
	});

// Commits happen on user actions, see ADR 2.
export const history = new History<PresetNode>({
	read,
	restore: (snapshot) => {
		palette.root = parseTree(snapshot);
	},
	onChange: (snapshot) => {
		storePalette(pack(snapshot));
		syncUrl(snapshot);
	}
});

// The URL shows the palette right away, but storage only changes
// on edits, so opening a link keeps the stored palette.
export const startHistory = () => {
	history.reset();
	syncUrl(read());
};

// Fallback for edits that have no natural end.
const commitWhenIdle = debounce(() => history.commit(), 500);

$effect.root(() => {
	$effect(() => {
		if (palette.root) {
			JSON.stringify(read());
			commitWhenIdle();
		}
	});
});
