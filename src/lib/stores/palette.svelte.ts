import {schemistToRgb} from '#lib/color/conversion.js';
import {parseColor} from '#lib/color/parsing.js';
import type {PaletteColor} from '#lib/core/evaluate.js';
import {permalink} from '#lib/routing.js';
import type {
	Node,
	NodeOutputRecord
} from '#lib/stores/nodes.svelte.js';
import {collectOutputs} from '#lib/stores/nodes.svelte.js';
import {serializeTree} from '#lib/tree.js';
import {
	debounce,
	withElapsedTime
} from '#lib/utils/functions.js';
import {clamp} from '#lib/utils/math.js';

class Palette {
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
	settledOutputs: NodeOutputRecord = $state.raw({});

	// Colors of the settled outputs, as combinations and exports
	// need them.
	colors = $derived(
		Object.entries(this.settledOutputs).map(
			([id, {color, name}]): PaletteColor => ({
				id,
				color,
				rgbColor: schemistToRgb(color),
				name
			})
		)
	);

	rootColor = $derived(
		(this.root && this.settledOutputs[this.root.id]?.color) ??
			Object.values(this.settledOutputs).shift()?.color ??
			parseColor('#feffff')[1]! // not fully white so there is a hue to pick up
	);

	get permalink() {
		const {origin} = window.location;

		return this.root
			? permalink(serializeTree(this.root), origin)
			: origin;
	}

	constructor() {
		const update = debounce(
			(outputs: NodeOutputRecord) => {
				this.settledOutputs = outputs;
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
