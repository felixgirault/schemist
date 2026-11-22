import type {
	IdentifiedNodeData,
	NodeData,
	PresetPair
} from '#lib/core/nodes.js';
import {changedArg} from '#lib/core/tree.js';
import {pack} from '#lib/packing/index.js';
import {storePalette} from '#lib/palette.js';
import {presetQuery} from '#lib/routing.js';
import type {Node, NodePair} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {pairsOn, parseTree, serializeTree} from '#lib/tree.js';
import {debounce} from '#lib/utils/functions.js';
import {History} from '#lib/utils/history.svelte.js';
import {goto} from '$app/navigation';
import {untrack} from 'svelte';

// A state of the palette. Pairs are by node ids, which the tree
// keeps once restored, so that undoing brings back the pairs of
// that state, whatever the nodes became since.
export type Snapshot = {
	tree: IdentifiedNodeData;
	pairs: PresetPair[];
};

export const read = (root: Node, pairs: NodePair[]) =>
	$state.snapshot({
		tree: serializeTree(root),
		pairs: pairs.map(({fg, bg, ...targets}) => ({
			...targets,
			fg: fg.id,
			bg: bg.id
		}))
	}) as Snapshot;

// What is saved: names instead of ids, see `namePairs`.
const toData = ({tree, pairs}: Snapshot): NodeData => {
	const root = parseTree(tree);
	return serializeTree(root, pairsOn(root, pairs));
};

const syncUrl = (snapshot: NodeData) =>
	goto(location.pathname + presetQuery(snapshot), {
		replace: true,
		shallow: true,
		state: {}
	});

// States change on every slider step, which is too often to
// rewrite the URL.
const persist = debounce((snapshot: Snapshot) => {
	const data = toData(snapshot);

	storePalette(pack(data));
	syncUrl(data);
}, 300);

// Every change of the palette is recorded, see ADR 9.
export const history = new History<Snapshot>({
	restore: ({tree, pairs}) => {
		const root = parseTree(tree);

		palette.root = root;
		palette.storedPairs = pairsOn(root, pairs);
	},
	onChange: persist,
	group: (previous, next) =>
		JSON.stringify(previous.pairs) ===
		JSON.stringify(next.pairs)
			? changedArg(previous.tree, next.tree)
			: undefined
});

// The URL shows the palette right away, but storage only changes
// on edits, so opening a link keeps the stored palette.
// Returns a function that stops recording.
export const startHistory = (root: Node) => {
	const snapshot = read(root, palette.pairs);
	history.reset(snapshot);
	syncUrl(toData(snapshot));

	return $effect.root(() => {
		$effect(() => {
			if (palette.root) {
				const snapshot = read(palette.root, palette.pairs);
				untrack(() => history.record(snapshot));
			}
		});
	});
};
