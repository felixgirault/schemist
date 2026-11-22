import type {
	AppRole,
	AppRule,
	IdentifiedNodeData,
	NodeData,
	PresetPair
} from '#lib/core/nodes.js';
import {changedArg} from '#lib/core/tree.js';
import {pack} from '#lib/packing/index.js';
import {storePalette} from '#lib/palette.js';
import {presetQuery} from '#lib/routing.js';
import type {ColorPair, Node} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {
	pairsOn,
	parseTree,
	rolesOn,
	serializeTree
} from '#lib/tree.js';
import {debounce} from '#lib/utils/functions.js';
import {History} from '#lib/utils/history.svelte.js';
import {goto} from '$app/navigation';
import {untrack} from 'svelte';

// A state of the palette. Pairs and roles are by color ids, rules by
// role ids, which the tree
// keeps once restored, so that undoing brings back the pairs of
// that state, whatever the nodes became since.
export type Snapshot = {
	tree: IdentifiedNodeData;
	pairs: PresetPair[];
	roles: AppRole[];
	rules: AppRule[];
};

export const read = (
	root: Node,
	pairs: ColorPair[],
	roles: AppRole[],
	rules: AppRule[]
) =>
	$state.snapshot({
		tree: serializeTree(root),
		pairs,
		roles,
		rules
	}) as Snapshot;

const readPalette = (root: Node) =>
	read(root, palette.pairs, palette.roles, palette.rules);

// What is saved: names instead of ids, see `namePairs`.
const toData = ({
	tree,
	pairs,
	roles,
	rules
}: Snapshot): NodeData => {
	const root = parseTree(tree);
	return serializeTree(
		root,
		pairsOn(root, pairs),
		rolesOn(root, roles),
		rules
	);
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
	restore: ({tree, pairs, roles, rules}) => {
		const root = parseTree(tree);

		palette.root = root;
		palette.storedPairs = pairsOn(root, pairs);
		palette.storedRoles = rolesOn(root, roles);
		palette.rules = rules;
	},
	onChange: persist,
	group: (previous, next) =>
		JSON.stringify([
			previous.pairs,
			previous.roles,
			previous.rules
		]) === JSON.stringify([next.pairs, next.roles, next.rules])
			? changedArg(previous.tree, next.tree)
			: undefined
});

// The URL shows the palette right away, but storage only changes
// on edits, so opening a link keeps the stored palette.
// Returns a function that stops recording.
export const startHistory = (root: Node) => {
	const snapshot = readPalette(root);
	history.reset(snapshot);
	syncUrl(toData(snapshot));

	return $effect.root(() => {
		$effect(() => {
			if (palette.root) {
				const snapshot = readPalette(palette.root);
				untrack(() => history.record(snapshot));
			}
		});
	});
};
