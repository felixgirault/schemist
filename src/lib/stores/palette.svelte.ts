import {parseColor} from '#lib/color/parsing.js';
import type {
	Node,
	NodeOutputRecord
} from '#lib/stores/nodes.svelte.js';
import {collectOutputs} from '#lib/stores/nodes.svelte.js';
import {
	debounce,
	withElapsedTime
} from '#lib/utils/functions.js';
import {clamp} from '#lib/utils/math.js';

class Palette {
	// Set when the palette mounts, as it is read from the URL or
	// storage.
	root = $state<Node>();
	outputs = $derived(
		this.root ? collectOutputs(this.root) : {}
	);

	// Debounces outputs so an update is almost instantaneous by
	// default, but gets postponed longer as the previous call
	// gets closer.
	// This allows for a snappy feel on single updates while
	// keeping reasonable performance on fast recurring ones
	// (i.e. when the user drags a range input).
	debouncedOutputs: NodeOutputRecord = $state.raw({});

	rootColor = $derived(
		(this.root && this.debouncedOutputs[this.root.id]?.[0]) ??
			Object.values(this.debouncedOutputs).shift()?.[0] ??
			parseColor('#feffff')[1]! // not fully white so there is a hue to pick up
	);

	constructor() {
		const update = debounce(
			(outputs: NodeOutputRecord) => {
				this.debouncedOutputs = outputs;
			},
			withElapsedTime(
				(time) => 10 + clamp(400 - time, 400) / 2
			)
		);

		$effect.root(() => {
			$effect(() => update(this.outputs));
		});
	}
}

export const palette = new Palette();
