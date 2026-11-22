import {formatSchemistToHex} from '#lib/color/formatting.js';
import {parseColor} from '#lib/color/parsing.js';
import presets from '#lib/definitions/presets/index.js';
import {pack, unpack} from '#lib/packing/index.js';
import type {Node, NodePair} from '#lib/stores/nodes.svelte.js';
import {
	collectNodes,
	collectOutputs
} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {rootTree} from '#lib/testing/tree.js';
import {
	namePairs,
	parsePairs,
	parseTree,
	serializeTree
} from '#lib/tree.js';
import {beforeEach, describe, expect, test, vi} from 'vitest';

const cases = Object.values(presets).flatMap((preset) =>
	['#ff0000', '#3b82f6', '#808080'].map((hex) => ({
		preset,
		hex
	}))
);

test.each(cases)(
	'outputs of preset $preset.label under $hex',
	({preset, hex}) => {
		const outputs = Object.values(
			collectOutputs(
				parseTree(rootTree(hex, [{type: preset.type}]))
			)
		).map(({color, name}) => [
			formatSchemistToHex(color),
			name
		]);

		expect(outputs).toMatchSnapshot();
	}
);

// Serializes the palette as a permalink does, and loads it back.
const reload = (root: Node, pairs: NodePair[]) => {
	const tree = unpack(pack(serializeTree(root, pairs)));
	const loaded = parseTree(tree);

	return {root: loaded, pairs: parsePairs(tree, loaded)};
};

// Where the nodes of each pair stand in the tree.
const positions = (root: Node, pairs: NodePair[]) => {
	const nodes = collectNodes(root);

	return pairs.map(({fg, bg, wcag2, apca, difference}) => ({
		fg: nodes.indexOf(fg),
		bg: nodes.indexOf(bg),
		wcag2,
		apca,
		difference
	}));
};

const expectSaved = () => {
	const root = palette.root!;
	const {saved} = namePairs(root, palette.pairs);
	const back = reload(root, palette.pairs);
	const expected = palette.pairs.filter(({fg, bg}) =>
		saved.some(
			(p) => p.fg === fg.output.name && p.bg === bg.output.name
		)
	);

	expect(saved).toHaveLength(expected.length);
	expect(positions(back.root, back.pairs)).toEqual(
		positions(root, expected)
	);
};

const find = (token: string) =>
	collectNodes(palette.root!).find(
		(node) => node.token === token
	)!;

describe('declared pairs', () => {
	let bg: Node, text: Node, accent: Node, onAccent: Node;

	beforeEach(() => {
		palette.root = parseTree({
			type: 'clr',
			token: 'Bg',
			args: {color: parseColor('#ffffff')[1]!},
			children: [
				{type: 'ctr', token: 'Text'},
				{
					type: 'cmp',
					token: 'Accent',
					children: [{type: 'ctr', token: 'On $'}]
				}
			]
		});
		[bg, text, accent, onAccent] = collectNodes(palette.root!);
		palette.storedPairs = [];
		palette.setPair(text, bg, {wcag2: 4.5, apca: 60});
		palette.setPair(onAccent, accent, {wcag2: 4.5});
		palette.setPair(accent, bg, {difference: 10});
	});

	test('survive a round trip', () => {
		expect(palette.pairs).toHaveLength(3);
		expectSaved();
	});

	test('follow renames and parent renames', () => {
		text.token = 'Body';
		accent.token = 'Brand';
		expect(onAccent.output.name).toBe('On Brand');
		expectSaved();
		expect(
			reload(palette.root!, palette.pairs).pairs
		).toHaveLength(3);
	});

	test('follow moves', () => {
		text.addChild(accent);
		expectSaved();
		expect(
			reload(palette.root!, palette.pairs).pairs
		).toHaveLength(3);
	});

	test('follow hiding', () => {
		accent.isHidden = true;
		expectSaved();
		expect(
			reload(palette.root!, palette.pairs).pairs
		).toHaveLength(3);
	});

	test('are dropped with a removed color', () => {
		accent.destroy();
		expect(palette.pairs).toHaveLength(1);
		expectSaved();
		expect(
			reload(palette.root!, palette.pairs).pairs
		).toHaveLength(1);
	});

	test('wait for a rename when two colors share a name', () => {
		text.token = 'Accent';
		expect(
			palette.unsavedPairs.map(({names}) => names)
		).toEqual([['Accent'], ['Accent'], ['Accent']]);
		expect(reload(palette.root!, palette.pairs).pairs).toEqual(
			[]
		);
		expectSaved();

		text.token = 'Text';
		expect(palette.unsavedPairs).toEqual([]);
		expect(
			reload(palette.root!, palette.pairs).pairs
		).toHaveLength(3);
	});

	test('drop a bad pair of a link and keep the rest', () => {
		const log = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});
		const tree = {
			...serializeTree(palette.root!, palette.pairs),
			pairs: [
				{fg: 'Nope', bg: 'Bg', wcag2: 3},
				{fg: 'Text', bg: 'Bg', wcag2: 3}
			]
		};
		const root = parseTree(tree);

		expect(parsePairs(tree, root)).toHaveLength(1);
		expect(log).toHaveBeenCalledOnce();
		log.mockRestore();
	});

	test('remove with no target', () => {
		palette.setPair(text, bg, {});
		expect(palette.pairs).toHaveLength(2);
	});
});
