import {pack} from '#lib/packing/index.js';
import {storePalette} from '#lib/palette.js';
import type {
	IdentifiedPresetNode,
	PresetNode
} from '#lib/presets.js';
import {
	changedArg,
	parseTree,
	serializeTree
} from '#lib/presets.js';
import {presetQuery} from '#lib/routing.js';
import type {Node} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {debounce} from '#lib/utils/functions.js';
import {History} from '#lib/utils/history.svelte.js';
import {goto} from '$app/navigation';
import {untrack} from 'svelte';

const read = (root: Node) =>
	$state.snapshot(serializeTree(root));

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
export const history = new History<IdentifiedPresetNode>({
	restore: (snapshot) => {
		palette.root = parseTree(snapshot);
	},
	onChange: persist,
	group: changedArg
});

// The URL shows the palette right away, but storage only changes
// on edits, so opening a link keeps the stored palette.
export const startHistory = (root: Node) => {
	const snapshot = read(root);
	history.reset(snapshot);
	syncUrl(snapshot);
};

$effect.root(() => {
	$effect(() => {
		if (palette.root) {
			const snapshot = read(palette.root);
			untrack(() => history.record(snapshot));
		}
	});
});
