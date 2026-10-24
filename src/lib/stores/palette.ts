import {parseColor} from '#lib/color/parsing.js';
import type {Node, NodeOutputRecord} from '#lib/stores/nodes.js';
import {withElapsedTime} from '#lib/utils/functions.js';
import {clamp} from '#lib/utils/math.js';
import {debouncedStore} from '#lib/utils/stores.js';
import {derived, get, writable} from 'svelte/store';

export const outputs = writable<NodeOutputRecord>({});

// When a color is updated, all of its children gets updated
// as well, in a short burst of updates.
// This intermediate step merges these bursts into single
// updates.
// This is a huge smell but it gets things working.
export const groupedOutputs = debouncedStore(outputs, 5);

// Debounces outputs so an update is almost instantaneous by
// default, but gets postponed longer as the previous call
// gets closer.
// This allows for a snappy feel on single updates while
// keeping reasonable performance on fast recurring ones
// (i.e. when the user drags a range input).
export const debouncedOutputs = debouncedStore(
	groupedOutputs,
	withElapsedTime((time) => 10 + clamp(400 - time, 400) / 2)
);

export const rootNode = writable<Node>();
export const rootColor = derived(debouncedOutputs, () => {
	const $outputs = get(outputs);
	const rootId = get(rootNode)?.id;
	return (
		$outputs?.[rootId]?.[0] ??
		Object.values($outputs).shift()?.[0] ??
		parseColor('#feffff')[1]! // not fully white so there is a hue to pick up
	);
});
