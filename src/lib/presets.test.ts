import {formatSchemistToHex} from '#lib/color/formatting.js';
import {parseColor} from '#lib/color/parsing.js';
import presets from '#lib/definitions/presets/index.js';
import {pack, unpack} from '#lib/packing/index.js';
import type {ColorPair, Node} from '#lib/stores/nodes.svelte.js';
import {
	collectColors,
	collectNodes,
	collectOutputs
} from '#lib/stores/nodes.svelte.js';
import {palette} from '#lib/stores/palette.svelte.js';
import {rootTree} from '#lib/testing/tree.js';
import {
	expandPreset,
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
const reload = (root: Node, pairs: ColorPair[]) => {
	const tree = unpack(pack(serializeTree(root, pairs)));
	const loaded = parseTree(tree);

	return {root: loaded, pairs: parsePairs(tree, loaded)};
};

// Where the nodes of each pair stand in the tree.
const positions = (root: Node, pairs: ColorPair[]) => {
	const ids = collectColors(root).map(({id}) => id);

	return pairs.map(({fg, bg, wcag2, apca, difference}) => ({
		fg: ids.indexOf(fg),
		bg: ids.indexOf(bg),
		wcag2,
		apca,
		difference
	}));
};

const expectSaved = () => {
	const root = palette.root!;
	const {saved} = namePairs(root, palette.pairs);
	const back = reload(root, palette.pairs);
	const names = new Map(
		collectColors(root).map(({id, name}) => [id, name])
	);
	const expected = palette.pairs.filter(({fg, bg}) =>
		saved.some(
			(p) => p.fg === names.get(fg) && p.bg === names.get(bg)
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
		palette.setPair(text.id, bg.id, {wcag2: 4.5, apca: 60});
		palette.setPair(onAccent.id, accent.id, {wcag2: 4.5});
		palette.setPair(accent.id, bg.id, {difference: 10});
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
		palette.setPair(text.id, bg.id, {});
		expect(palette.pairs).toHaveLength(2);
	});
});

describe('pairs on the colors of a preset', () => {
	let root: Node, preset: Node;

	beforeEach(() => {
		root = palette.root = parseTree(
			rootTree('#3b82f6', [{type: 'stt', token: 'Brand'}])
		);
		preset = root.children[0];
		palette.storedPairs = [];
		palette.setPair(`${preset.id}.0`, root.id, {wcag2: 4.5});
	});

	test('are kept, saved by name and restored', () => {
		expect(palette.pairs).toHaveLength(1);
		expect(namePairs(root, palette.pairs).saved).toEqual([
			expect.objectContaining({fg: 'Brand light'})
		]);

		const back = reload(root, palette.pairs);

		expect(back.pairs).toEqual([
			expect.objectContaining({
				fg: `${back.root.children[0].id}.0`,
				bg: back.root.id,
				wcag2: 4.5
			})
		]);
	});

	test('are kept when the preset is hidden', () => {
		preset.isHidden = true;
		expect(palette.pairs).toHaveLength(1);
		expect(
			palette.allColors.find(
				({id}) => id === `${preset.id}.0`
			)?.isHidden
		).toBe(true);
	});

	test('survive expanding the preset', () => {
		expandPreset(preset);
		expect(palette.pairs).toHaveLength(1);
		expectSaved();
	});
});
