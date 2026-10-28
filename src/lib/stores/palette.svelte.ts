import {schemistToRgb} from '#lib/color/conversion.js';
import {parseColor} from '#lib/color/parsing.js';
import type {RgbColor} from '#lib/color/types.js';
import type {
	NodeOutput,
	NodeOutputRecord
} from '#lib/model/tree.js';
import type {Node} from '#lib/stores/nodes.svelte.js';
import {collectOutputs} from '#lib/stores/nodes.svelte.js';
import {
	debounce,
	withElapsedTime
} from '#lib/utils/functions.js';
import {clamp} from '#lib/utils/math.js';

// A color of the palette, as combined and exported.
export type PaletteColor = NodeOutput & {
	id: Node['id'];
	rgbColor: RgbColor;
};

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
	// Nodes show their own outputs right away, while combinations
	// and exports, which cost more, follow these.
	settledOutputs: NodeOutputRecord = $state.raw({});

	colors = $derived(
		Object.entries(this.settledOutputs).map(
			([id, {color, name}]): PaletteColor => ({
				id,
				color,
				name,
				rgbColor: schemistToRgb(color)
			})
		)
	);

	rootColor = $derived(
		(this.root && this.settledOutputs[this.root.id]?.color) ??
			Object.values(this.settledOutputs).shift()?.color ??
			parseColor('#feffff')[1]! // not fully white so there is a hue to pick up
	);

	constructor() {
		const update = debounce(
			(outputs: NodeOutputRecord) => {
				this.settledOutputs = outputs;
			},
			withElapsedTime(
				(time) => 10 + clamp(400 - time, 400) / 2
			)
		);

		// The first outputs are settled right away, so combinations
		// render along with the palette instead of after the delay.
		let isSettled = false;

		$effect.root(() => {
			$effect(() => {
				if (isSettled) {
					update(this.outputs);
				} else if (this.root) {
					this.settledOutputs = this.outputs;
					isSettled = true;
				}
			});
		});
	}
}

export const palette = new Palette();
