import {schemistToRgb} from '#lib/color/conversion.js';
import {parseColor} from '#lib/color/parsing.js';
import type {PaletteColor} from '#lib/core/evaluate.js';
import type {PairTargets} from '#lib/core/nodes.js';
import {permalink} from '#lib/routing.js';
import type {
	Node,
	NodeOutputRecord,
	ColorPair
} from '#lib/stores/nodes.svelte.js';
import {
	collectColors,
	collectOutputs
} from '#lib/stores/nodes.svelte.js';
import {namePairs, serializeTree} from '#lib/tree.js';
import {
	debounce,
	withElapsedTime
} from '#lib/utils/functions.js';
import {clamp} from '#lib/utils/math.js';

class Palette {
	root = $state<Node>();
	// Declared pairs, as they were set: some may be of colors since
	// removed, see `pairs`.
	storedPairs = $state.raw<ColorPair[]>([]);
	// Every color of the tree, hidden ones included.
	allColors = $derived(
		this.root ? collectColors(this.root) : []
	);
	// The stored pairs whose two colors are still in the tree, so
	// that no removal has to remember the pairs.
	pairs = $derived.by(() => {
		const ids = new Set(this.allColors.map(({id}) => id));

		return this.storedPairs.filter(
			({fg, bg}) => ids.has(fg) && ids.has(bg)
		);
	});
	// The pairs a permalink cannot hold until a color is renamed
	unsavedPairs = $derived(
		this.root ? namePairs(this.root, this.pairs).unsaved : []
	);
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
			? permalink(
					serializeTree(this.root, this.pairs),
					origin
				)
			: origin;
	}

	// Declares the pair of two colors, or removes it with no target.
	setPair(
		fg: string,
		bg: string,
		{wcag2, apca, difference}: PairTargets
	) {
		const others = this.pairs.filter(
			(pair) => pair.fg !== fg || pair.bg !== bg
		);

		this.storedPairs =
			wcag2 === undefined &&
			apca === undefined &&
			difference === undefined
				? others
				: [...others, {fg, bg, wcag2, apca, difference}];
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
